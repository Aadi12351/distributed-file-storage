pipeline {
    agent { label 'drive-build' }

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        KUBECONFIG = '/home/drive-agent/.kube/config'
        KUBE_CONTEXT = 'kind-drive'
        KUBE_NAMESPACE = 'drive'
        KIND_CLUSTER = 'drive'
        REPO_URL = 'https://github.com/Aadi12351/distributed-file-storage.git'
        GITOPS_BRANCH = 'gitops'
    }

    stages {
        stage('Checkout') {
            steps {
                deleteDir()

                git branch: 'main',
                    credentialsId: 'github-drive',
                    url: env.REPO_URL

                script {
                    def commit = sh(
                        script: 'git rev-parse --short=12 HEAD',
                        returnStdout: true
                    ).trim()

                    env.IMAGE_TAG = "${commit}-${env.BUILD_NUMBER}"
                }
            }
        }

        stage('Check Tools') {
            steps {
                sh '''
                    set -eu

                    git --version
                    docker version
                    kind version
                    kubectl version --client

                    kubectl --context "$KUBE_CONTEXT" \
                      get deployment backend frontend \
                      -n "$KUBE_NAMESPACE"

                    kubectl --context "$KUBE_CONTEXT" \
                      get application drive -n argocd
                '''
            }
        }

        stage('Build Backend') {
            steps {
                sh '''
                    set -eu

                    docker build \
                      -t "drive-backend:$IMAGE_TAG" .
                '''
            }
        }

        stage('Test Backend') {
            steps {
                sh '''
                    set -eu
                    mkdir -p reports

                    docker run --rm \
                      --network none \
                      --memory 768m \
                      --cpus 1 \
                      --user "$(id -u):$(id -g)" \
                      --tmpfs "/data:rw,uid=$(id -u),gid=$(id -g),mode=0700" \
                      --mount "type=bind,src=$WORKSPACE/tests,dst=/srv/tests,readonly" \
                      --mount "type=bind,src=$WORKSPACE/reports,dst=/reports" \
                      -e SECRET_KEY=disposable-ci-test-key-not-for-production \
                      -e ALGORITHM=HS256 \
                      -e ACCESS_TOKEN_EXPIRE_MINUTES=60 \
                      -e DATABASE_URL=sqlite:////data/test-bootstrap.db \
                      "drive-backend:$IMAGE_TAG" \
                      python -m pytest \
                        /srv/tests/test_drive_local.py \
                        /srv/tests/test_security_local.py \
                        -v -p no:cacheprovider \
                        --junitxml=/reports/backend-tests.xml
                '''
            }

            post {
                always {
                    junit testResults: 'reports/backend-tests.xml',
                          allowEmptyResults: false
                }
            }
        }

        stage('Build Frontend') {
            steps {
                sh '''
                    set -eu

                    docker build \
                      -f frontend/Dockerfile \
                      -t "drive-frontend:$IMAGE_TAG" .
                '''
            }
        }

        stage('Load Images into Kind') {
            steps {
                sh '''
                    set -eu

                    kind load docker-image \
                      "drive-backend:$IMAGE_TAG" \
                      "drive-frontend:$IMAGE_TAG" \
                      --name "$KIND_CLUSTER"
                '''
            }
        }

        stage('Update GitOps Branch') {
            steps {
                withCredentials([
                    gitUsernamePassword(
                        credentialsId: 'github-drive',
                        gitToolName: 'Default'
                    )
                ]) {
                    sh '''
                        set -eu

                        git clone \
                          --single-branch \
                          --branch "$GITOPS_BRANCH" \
                          "$REPO_URL" \
                          gitops-work

                        # Publish this build's Kubernetes configuration.
                        cp k8s/*.yaml gitops-work/k8s/

                        # Update the backend application and init container.
                        sed -i -E \
                          "s|image: drive-backend:[^[:space:]]+|image: drive-backend:$IMAGE_TAG|g" \
                          gitops-work/k8s/backend-deployment.yaml

                        # Update the frontend container.
                        sed -i -E \
                          "s|image: drive-frontend:[^[:space:]]+|image: drive-frontend:$IMAGE_TAG|g" \
                          gitops-work/k8s/frontend-deployment.yaml

                        # Confirm all three image references were updated.
                        grep -Fq "image: drive-backend:$IMAGE_TAG" \
                          gitops-work/k8s/backend-deployment.yaml

                        grep -Fq "image: drive-frontend:$IMAGE_TAG" \
                          gitops-work/k8s/frontend-deployment.yaml

                        backend_count=$(grep -Fc \
                          "image: drive-backend:$IMAGE_TAG" \
                          gitops-work/k8s/backend-deployment.yaml)

                        test "$backend_count" -eq 2

                        cd gitops-work

                        git config user.name "Drive Jenkins"
                        git config user.email "jenkins@drive.local"

                        git add k8s/

                        if git diff --cached --quiet; then
                            echo "Deployment configuration is already current."
                        else
                            git commit \
                              -m "Deploy Drive image $IMAGE_TAG"

                            git push origin "HEAD:$GITOPS_BRANCH"
                        fi

                        git rev-parse HEAD \
                          > "$WORKSPACE/reports/gitops-commit.txt"
                    '''
                }
            }
        }

        stage('Wait for Argo CD Deployment') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    sh '''
                        set -eu

                        # Wait for Argo CD to apply this build's images.
                        while true; do
                            backend_image=$(kubectl \
                              --context "$KUBE_CONTEXT" \
                              get deployment backend \
                              -n "$KUBE_NAMESPACE" \
                              -o jsonpath='{.spec.template.spec.containers[0].image}')

                            backend_init_image=$(kubectl \
                              --context "$KUBE_CONTEXT" \
                              get deployment backend \
                              -n "$KUBE_NAMESPACE" \
                              -o jsonpath='{.spec.template.spec.initContainers[0].image}')

                            frontend_image=$(kubectl \
                              --context "$KUBE_CONTEXT" \
                              get deployment frontend \
                              -n "$KUBE_NAMESPACE" \
                              -o jsonpath='{.spec.template.spec.containers[0].image}')

                            if \
                              [ "$backend_image" = "drive-backend:$IMAGE_TAG" ] && \
                              [ "$backend_init_image" = "drive-backend:$IMAGE_TAG" ] && \
                              [ "$frontend_image" = "drive-frontend:$IMAGE_TAG" ]
                            then
                                echo "Argo CD applied image tag $IMAGE_TAG."
                                break
                            fi

                            echo "Waiting for Argo CD to apply $IMAGE_TAG..."
                            sleep 10
                        done

                        # Wait for the updated workloads to become ready.
                        kubectl --context "$KUBE_CONTEXT" \
                          rollout status deployment/backend \
                          -n "$KUBE_NAMESPACE" \
                          --timeout=180s

                        kubectl --context "$KUBE_CONTEXT" \
                          rollout status deployment/frontend \
                          -n "$KUBE_NAMESPACE" \
                          --timeout=180s
                    '''
                }
            }
        }

        stage('Verify Application') {
            steps {
                sh '''
                    set -eu

                    curl --fail --silent --show-error \
                      --retry 5 --retry-connrefused \
                      --connect-timeout 5 --max-time 15 \
                      http://127.0.0.1:8081/ \
                      -o /dev/null

                    curl --fail --silent --show-error \
                      --retry 5 --retry-connrefused \
                      --connect-timeout 5 --max-time 15 \
                      http://127.0.0.1:8081/api/ \
                      -o reports/api-response.json

                    grep -q 'Distributed File Storage API' \
                      reports/api-response.json

                    kubectl --context "$KUBE_CONTEXT" \
                      get pods -n "$KUBE_NAMESPACE"

                    kubectl --context "$KUBE_CONTEXT" \
                      get application drive -n argocd
                '''
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'reports/*',
                             allowEmptyArchive: true
        }

        success {
            echo "Drive verified successfully. Image tag: ${env.IMAGE_TAG}"
        }

        failure {
            echo 'Pipeline failed. Check the failed stage and Argo CD application status. No automatic rollback was performed.'
        }
    }
}

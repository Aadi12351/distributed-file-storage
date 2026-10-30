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
    }

    stages {
        stage('Checkout') {
            steps {
                deleteDir()

                git branch: 'main',
                    credentialsId: 'github-drive',
                    url: 'https://github.com/Aadi12351/distributed-file-storage.git'

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
                      get deployment backend frontend -n "$KUBE_NAMESPACE"
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

        stage('Prepare Deployment') {
            steps {
                sh '''
                    set -eu
                    mkdir -p rendered

                    kubectl set image \
                      -f k8s/backend-deployment.yaml \
                      backend="drive-backend:$IMAGE_TAG" \
                      prepare-storage="drive-backend:$IMAGE_TAG" \
                      --local -o yaml \
                      > rendered/backend.yaml

                    kubectl set image \
                      -f k8s/frontend-deployment.yaml \
                      frontend="drive-frontend:$IMAGE_TAG" \
                      --local -o yaml \
                      > rendered/frontend.yaml
                '''
            }
        }

        stage('Deploy Backend') {
            steps {
                sh '''
                    set -eu

                    kubectl --context "$KUBE_CONTEXT" apply \
                      -f k8s/backend-service.yaml \
                      -f k8s/frontend-service.yaml

                    kubectl --context "$KUBE_CONTEXT" apply \
                      -f rendered/backend.yaml

                    kubectl --context "$KUBE_CONTEXT" rollout status \
                      deployment/backend -n "$KUBE_NAMESPACE" \
                      --timeout=180s
                '''
            }
        }

        stage('Deploy Frontend') {
            steps {
                sh '''
                    set -eu
                    kubectl --context "$KUBE_CONTEXT" apply \
                      -f rendered/frontend.yaml

                    kubectl --context "$KUBE_CONTEXT" rollout status \
                      deployment/frontend -n "$KUBE_NAMESPACE" \
                      --timeout=180s
                '''
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
                '''
            }
        }
    }

    post {
        success {
            echo "Drive deployed successfully. Image tag: ${env.IMAGE_TAG}"
        }

        failure {
            echo 'Pipeline failed. Review the failed stage before retrying.'
        }
    }
}

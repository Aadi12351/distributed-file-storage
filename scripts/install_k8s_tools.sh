#!/usr/bin/env bash
set -Eeuo pipefail

KIND_VERSION="v0.33.0"
KUBECTL_VERSION="v1.37.1"

case "$(uname -m)" in
  x86_64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *)
    echo "Unsupported architecture: $(uname -m)"
    exit 1
    ;;
esac

for tool in curl sha256sum sudo docker; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing prerequisite: $tool"
    exit 1
  fi
done

docker info >/dev/null
sudo -n true

TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT
cd "$TEMP_DIR"

echo "Downloading Kind ${KIND_VERSION}..."

KIND_URL="https://github.com/kubernetes-sigs/kind/releases/download/${KIND_VERSION}"

curl --fail --location --retry 3 \
  "${KIND_URL}/kind-linux-${ARCH}" \
  --output "kind-linux-${ARCH}"

curl --fail --location --retry 3 \
  "${KIND_URL}/kind-linux-${ARCH}.sha256sum" \
  --output kind.sha256sum

sha256sum --check kind.sha256sum

echo "Downloading kubectl ${KUBECTL_VERSION}..."

KUBECTL_URL="https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${ARCH}"

curl --fail --location --retry 3 \
  "${KUBECTL_URL}/kubectl" \
  --output kubectl

curl --fail --location --retry 3 \
  "${KUBECTL_URL}/kubectl.sha256" \
  --output kubectl.sha256

echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check

echo "Installing verified binaries..."

sudo install -o root -g root -m 0755 \
  "kind-linux-${ARCH}" /usr/local/bin/kind

sudo install -o root -g root -m 0755 \
  kubectl /usr/local/bin/kubectl

/usr/local/bin/kind version
/usr/local/bin/kubectl version --client

echo "Installation complete. No cluster was created."

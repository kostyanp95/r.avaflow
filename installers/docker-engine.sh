#!/bin/bash

# Check if user is root
if [ "$(id -u)" -ne 0 ]; then
  echo "Script must be run as root."
  exit 1
fi

# Determine the OS and package manager
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$NAME
  PM=$(command -v yum || command -v apt-get)
fi

# Install Docker
case $OS in
  "Ubuntu")
    $PM update
    $PM install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    $PM update
    $PM install -y docker-ce docker-ce-cli containerd.io
    ;;
  "Debian GNU/Linux")
    $PM update
    $PM install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo apt-key add -
    add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/debian $(lsb_release -cs) stable"
    $PM update
    $PM install -y docker-ce docker-ce-cli containerd.io
    ;;
  "CentOS Linux")
    $PM install -y yum-utils
    yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
    $PM install -y docker-ce docker-ce-cli containerd.io
    ;;
  "Fedora")
    $PM install -y dnf-plugins-core
    $PM config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
    $PM install -y docker-ce docker-ce-cli containerd.io
    ;;
  "openSUSE Leap")
    $PM install -y docker
    systemctl enable docker.service
    systemctl start docker.service
    ;;
  "openSUSE Tumbleweed")
    $PM install -y docker
    systemctl enable docker.service
    systemctl start docker.service
    ;;
  "Arch Linux")
    $PM install -y docker
    systemctl enable docker.service
    systemctl start docker.service
    ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
esac

# Add user to docker group
if ! groups | grep -q '\bdocker\b'; then
  usermod -aG docker $USER
  echo "You need to log out and log back in for the changes to take effect."
fi

echo "Docker installed successfully."

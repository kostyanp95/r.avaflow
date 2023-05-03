const os = require('os');
const { execSync } = require('child_process');

const platform = os.platform();

if (platform === 'win32') {
  // Install Chocolatey
  execSync('Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString(\'https://chocolatey.org/install.ps1\'))');

  // Install WSL
  execSync('powershell.exe Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux');

  // Install Docker Desktop using Chocolatey
  execSync('choco install docker-desktop -y');
} else if (platform === 'darwin') {
  // Install Docker Desktop for Mac
  execSync('brew install --cask docker');
} else if (platform === 'linux') {
  // Install Docker Engine for Ubuntu
  execSync('sudo apt-get update');
  execSync('sudo apt-get install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common');
  execSync('curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -');
  execSync('sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"');
  execSync('sudo apt-get update');
  execSync('sudo apt-get install -y docker-ce docker-ce-cli containerd.io');
}

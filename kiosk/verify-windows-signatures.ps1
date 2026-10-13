param(
  [Parameter(Mandatory = $true)][string]$AppPath,
  [Parameter(Mandatory = $true)][string]$InstallerPath,
  [string]$ExpectedThumbprint = ''
)

$ErrorActionPreference = 'Stop'

foreach ($FilePath in @($AppPath, $InstallerPath)) {
  if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
    throw "Missing release artifact: $FilePath"
  }

  $Signature = Get-AuthenticodeSignature -LiteralPath $FilePath
  if ($Signature.Status -ne 'Valid' -or $null -eq $Signature.SignerCertificate) {
    throw "Invalid Authenticode signature for $FilePath (status: $($Signature.Status))"
  }

  $ActualThumbprint = $Signature.SignerCertificate.Thumbprint.Replace(' ', '').ToUpperInvariant()
  if ($ExpectedThumbprint -and $ActualThumbprint -ne $ExpectedThumbprint) {
    throw "Unexpected signing certificate for $FilePath (thumbprint: $ActualThumbprint)"
  }

  Write-Host "Valid signature: $FilePath"
  Write-Host "Publisher: $($Signature.SignerCertificate.Subject)"
  Write-Host "Certificate thumbprint: $ActualThumbprint"
}

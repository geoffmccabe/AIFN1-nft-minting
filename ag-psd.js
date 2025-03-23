<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Mint Your AIFN1 NFT</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; background: #1a1a2e; color: white; padding: 50px; position: relative; }
        button { padding: 10px 20px; background: #4CAF50; color: white; border: none; cursor: pointer; font-size: 16px; border-radius: 5px; }
        button:hover { background: #45a049; }
        #status { margin-top: 20px; font-size: 14px; }
        .trait-row { display: flex; align-items: center; margin: 10px 0; }
        .trait-name, .variant-name { width: 150px; }
        .loading { color: #aaa; }
        #version { position: absolute; top: 10px; left: 10px; font-size: 12px; color: #aaa; }
    </style>
    <script src="https://unpkg.com/ethers@5.7.2/dist/ethers.umd.min.js"></script>
    <!-- Load ag-psd from local copy -->
    <script src="ag-psd.js"></script>
    <script src="config.js"></script>
</head>
<body>
    <!-- Updated version number with timestamp in Mountain Time (MDT) -->
    <div id="version">v1.0.2 - 2025-03-23 15:00:00 MDT</div>
    <h1>Mint Your AIFN1 NFT</h1>
    <input type="file" id="psdFile" accept=".psd" style="margin: 20px;" disabled>
    <div id="mintFeeDisplay">Mint Fee: Loading...</div>
    <div id="traitSelection" class="loading">Upload a PSD to select traits...</div>
    <br>
    <button onclick="mintNFT()" id="mintButton" disabled>Mint NFT</button>
    <div id="status">Ready to mint...</div>
    <script>
        if (!window.ethereum) { alert("Please install MetaMask or another Web3 wallet!"); throw new Error("No Web3 wallet detected"); }

        // Check if AgPsd is defined after loading the local script
        if (typeof AgPsd === 'undefined') {
            document.getElementById('status').innerText = "Error: PSD parsing library (ag-psd) failed to load: AgPsd is undefined. Please ensure ag-psd.js is correctly included in the repo.";
        } else {
            // Enable file input if AgPsd is loaded
            document.getElementById('psdFile').disabled = false;
            document.getElementById('status').innerText = "Ready to mint...";
        }

        // Use settings from config.js
        const { sepolia } = blockchainConfig;
        const contractAddress = sepolia.contractAddress;
        const abi = [
            {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
            {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},
            {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},
            {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"newFee","type":"uint256"}],"name":"MintFeeUpdated","type":"event"},
            {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"PaymentReceived","type":"event"},
            {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},
            {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"string","name":"newUri","type":"string"}],"name":"UriUpdated","type":"event"},
            {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Withdrawal","type":"event"},
            {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},
            {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
            {"inputs":[{"internalType":"uint256","name":"tokenId1","type":"uint256"},{"internalType":"uint256","name":"tokenId2","type":"uint256"}],"name":"forgeNFTs","outputs":[],"stateMutability":"payable","type":"function"},
            {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"freeGenerationsUsed","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
            {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
            {"inputs":[],"name":"generationFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
            {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address

// entry.js

document.addEventListener('DOMContentLoaded', () => {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const contract = new ethers.Contract(config.sepolia.contractAddress, config.abi, provider);
  const signer = provider.getSigner();
  const contractWithSigner = contract.connect(signer);

  let traits = [
    { name: '', variations: [], selected: 0 },
    { name: '', variations: [], selected: 0 },
    { name: '', variations: [], selected: 0 }
  ];
  let background = { url: '', metadata: '' };

  const preview = document.getElementById('preview');
  const traitImages = [
    document.getElementById('preview-trait1'),
    document.getElementById('preview-trait2'),
    document.getElementById('preview-trait3')
  ];
  const coordinates = document.getElementById('coordinates');
  const directionEmojis = document.querySelectorAll('.direction-emoji');

  let isDragging = false;
  let currentImage = null;
  let offsetX = 0;
  let offsetY = 0;
  let moveInterval = null;

  // Fetch background with user prompt
  async function fetchBackground() {
    try {
      const userPrompt = document.getElementById('user-prompt') ? document.getElementById('user-prompt').value.trim() : '';
      const url = `https://aifn-1-api-q1ni.vercel.app/api/generate-background${userPrompt ? `?prompt=${encodeURIComponent(userPrompt)}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch background: ${response.statusText}`);
      }
      const data = await response.json();
      background.url = data.imageUrl;
      background.metadata = data.metadata;

      const backgroundImage = document.getElementById('background-image');
      const previewBackground = document.getElementById('preview-background');
      const backgroundMetadata = document.getElementById('background-metadata');

      if (backgroundImage) backgroundImage.src = background.url;
      if (previewBackground) previewBackground.src = background.url;
      if (backgroundMetadata) backgroundMetadata.innerText = background.metadata;
    } catch (error) {
      console.error('Error fetching background:', error);
      const placeholder = 'https://archive.org/download/placeholder-image/placeholder-image.jpg';
      const backgroundImage = document.getElementById('background-image');
      const previewBackground = document.getElementById('preview-background');
      const backgroundMetadata = document.getElementById('background-metadata');

      if (backgroundImage) backgroundImage.src = placeholder;
      if (previewBackground) previewBackground.src = placeholder;
      if (backgroundMetadata) backgroundMetadata.innerText = 'Failed to load background';
    }
  }
  fetchBackground();

  // Mock the mint fee for now
  function fetchMintFee() {
    const mintFeeDisplay = document.getElementById('mintFeeDisplay');
    if (mintFeeDisplay) {
      mintFeeDisplay.innerText = `Mint Fee: 0.001 ETH (Mock)`;
    }
  }
  fetchMintFee();

  // Load saved positions from localStorage
  traitImages.forEach((img, index) => {
    if (img) {
      const savedPosition = localStorage.getItem(`trait${index + 1}-position`);
      if (savedPosition) {
        const { left, top } = JSON.parse(savedPosition);
        img.style.left = `${left}px`;
        img.style.top = `${top}px`;
      }
    }
  });

  // Update coordinates display
  function updateCoordinates(img) {
    if (img && coordinates) {
      const left = parseFloat(img.style.left) || 0;
      const top = parseFloat(img.style.top) || 0;
      coordinates.innerHTML = `<strong>Coordinates:</strong> (${Math.round(left) + 1}, ${Math.round(top) + 1})`;
    }
  }

  // Handle trait uploads
  for (let i = 1; i <= 3; i++) {
    const traitIndex = i - 1;
    const nameInput = document.getElementById(`trait${i}-name`);
    const fileInput = document.getElementById(`trait${i}-files`);
    const grid = document.getElementById(`trait${i}-grid`);

    if (fileInput && nameInput && grid) {
      fileInput.addEventListener('change', async (event) => {
        const files = Array.from(event.target.files).sort((a, b) => a.name.localeCompare(b.name));
        if (!files.length) return;

        const traitName = nameInput.value.trim() || `Trait ${i}`;
        traits[traitIndex].name = traitName;
        traits[traitIndex].variations = [];

        grid.innerHTML = '';
        for (const file of files) {
          const variationName = file.name.split('.').slic

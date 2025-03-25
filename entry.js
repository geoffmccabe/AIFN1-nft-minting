async function fetchBackground() {
  try {
    const userPrompt = document.getElementById('user-prompt') ? document.getElementById('user-prompt').value.trim() : '';
    const url = `https://aifn1-api-new.vercel.app/api/generate-background${userPrompt ? `?prompt=${encodeURIComponent(userPrompt)}` : ''}`; // Replace with your new Vercel domain
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch background: ${response.statusText}`);
    }
    const data = await response.json();
    background.url = data.imageUrl;
    background.metadata = data.metadata;
    document.getElementById('background-image').src = background.url;
    document.getElementById('preview-background').src = background.url;
    document.getElementById('background-metadata').innerText = background.metadata;
  } catch (error) {
    console.error('Error fetching background:', error);
    const placeholder = 'https://archive.org/download/placeholder-image/placeholder-image.jpg';
    document.getElementById('background-image').src = placeholder;
    document.getElementById('preview-background').src = placeholder;
    document.getElementById('background-metadata').innerText = 'Failed to load background';
  }
}

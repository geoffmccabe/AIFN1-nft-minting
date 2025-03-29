
    /* Section 1 - PANELS MANAGER FRAMEWORK */





    let idCounter = 0;
    function generateId() {
      return `id-${idCounter++}`;
    }

    class Panel {
      constructor(id, title, content, column = 'left', style = {}) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.column = column;
        this.style = { backgroundColor: '#ffffff', ...style };
        this.element = null;
      }

      render() {
        if (!this.element) {
          this.element = document.createElement('div');
          this.element.id = this.id;
          this.element.className = 'panel';
          const header = this.id === 'logo-panel' ? '' : `<div class="panel-top-bar"></div><h2>${this.title}</h2>`;
          this.element.innerHTML = header + this.content;
          Object.assign(this.element.style, {
            ...this.style,
            position: 'relative',
            cursor: 'default',
            display: 'block',
            width: '100%'
          });
        }
        return this.element;
      }

      update(content) {
        if (this.element) {
          const header = this.id === 'logo-panel' ? '' : `<div class="panel-top-bar"></div><h2>${this.title}</h2>`;
          const existingContent = this.element.querySelector('#preview, #trait-container, #preview-samples, #prompt-section, #mint-section');
          if (existingContent) {
            existingContent.innerHTML = (content || this.content).replace(/<[^>]+>/g, '');
          } else {
            this.element.innerHTML = header + (content || this.content);
          }
          Object.assign(this.element.style, {
            position: 'relative',
            width: '100%'
          });
        }
      }

      setColumn(column) {
        this.column = column;
      }
    }

    class PanelManager {
      constructor() {
        this.panels = [];
      }

      addPanel(panel) {
        this.panels.push(panel);
        this.renderAll();
      }

      removePanel(panelId) {
        this.panels = this.panels.filter(p => p.id !== panelId);
        this.renderAll();
      }

      renderAll() {
        const leftColumn = document.getElementById('left-column');
        const rightColumn = document.getElementById('right-column');
        if (!leftColumn || !rightColumn) {
          console.error('Columns not found during renderAll');
          return;
        }
        const leftPanels = this.panels.filter(p => p.column === 'left');
        const rightPanels = this.panels.filter(p => p.column === 'right');

        leftPanels.forEach(panel => {
          if (!document.getElementById(panel.id)) {
            leftColumn.appendChild(panel.render());
          } else {
            panel.update(panel.content);
          }
        });

        rightPanels.forEach(panel => {
          if (!document.getElementById(panel.id)) {
            rightColumn.appendChild(panel.render());
          } else {
            panel.update(panel.content);
          }
        });

        console.log(`Rendered ${leftPanels.length} panels in left column, ${rightPanels.length} in right column`);
      }

      setupDrag(panel) {
        const el = panel.element;
        let isDragging = false;
        let offsetX, offsetY;

        el.addEventListener('mousedown', (e) => {
          if (!e.target.classList.contains('panel-top-bar')) return;
          isDragging = true;
          const rect = el.getBoundingClientRect();
          offsetX = e.clientX - rect.left;
          offsetY = e.clientY - rect.top;
          el.style.position = 'absolute';
          el.style.zIndex = '1000';
          el.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          el.style.left = `${e.clientX - offsetX}px`;
          el.style.top = `${e.clientY - offsetY}px`;
        });

        document.addEventListener('mouseup', (e) => {
          if (!isDragging) return;
          isDragging = false;
          el.style.cursor = 'default';
          el.style.zIndex = '1';
          const dropX = e.clientX;
          const windowWidth = window.innerWidth;
          const newColumn = dropX < windowWidth / 2 ? 'left' : 'right';
          panel.setColumn(newColumn);
          const sameColumnPanels = this.panels.filter(p => p.column === newColumn);
          const insertIndex = sameColumnPanels.findIndex(p => p.element.getBoundingClientRect().top > e.clientY);
          if (insertIndex === -1) {
            this.panels = this.panels.filter(p => p !== panel).concat(panel);
          } else {
            const globalIndex = this.panels.findIndex(p => p.id === sameColumnPanels[insertIndex].id);
            this.panels = this.panels.filter(p => p !== panel);
            this.panels.splice(globalIndex, 0, panel);
          }
          this.renderAll();
          this.panels.forEach(p => this.setupDrag(p));
        });
      }
    }


  
    
    
    /* Section 2 - TRAIT MANAGER FRAMEWORK */





    const TraitManager = {
      traits: [],

      initialize() {
        this.traits = [];
        for (let i = 0; i < 3; i++) {
          this.addTrait(i + 1);
        }
      },

      addTrait(position) {
        const newTrait = {
          id: generateId(),
          position: position,
          name: '',
          isUserAssignedName: false,
          variants: [],
          selected: 0,
          zIndex: this.traits.length - position + 1,
          createdAt: Date.now()
        };
        this.traits.forEach(trait => {
          if (trait.position >= position) {
            trait.position++;
            trait.zIndex = this.traits.length - trait.position + 1;
          }
        });
        this.traits.push(newTrait);
        this.traits.sort((a, b) => a.position - b.position);
        return newTrait;
      },

      removeTrait(traitId) {
        const traitIndex = this.traits.findIndex(trait => trait.id === traitId);
        if (traitIndex === -1) return;
        const removedTrait = this.traits[traitIndex];
        const removedPosition = removedTrait.position;
        this.traits.splice(traitIndex, 1);
        this.traits.forEach(trait => {
          if (trait.position > removedPosition) {
            trait.position--;
            trait.zIndex = this.traits.length - trait.position + 1;
          }
        });
      },

      moveTrait(traitId, newPosition) {
        const trait = this.traits.find(t => t.id === traitId);
        if (!trait) return;
        const oldPosition = trait.position;
        const maxPosition = this.traits.length;
        if (newPosition === oldPosition) return;
        if (oldPosition === 1 && newPosition === maxPosition) {
          const lastTrait = this.traits.find(t => t.position === maxPosition);
          if (lastTrait) {
            lastTrait.position = 1;
            trait.position = maxPosition;
          }
        } else if (oldPosition === maxPosition && newPosition === 1) {
          const firstTrait = this.traits.find(t => t.position === 1);
          if (firstTrait) {
            firstTrait.position = maxPosition;
            trait.position = 1;
          }
        } else {
          const targetTrait = this.traits.find(t => t.position === newPosition);
          if (targetTrait) {
            targetTrait.position = oldPosition;
            trait.position = newPosition;
          }
        }
        this.traits.sort((a, b) => a.position - b.position);
        this.traits.forEach((t, idx) => {
          t.zIndex = this.traits.length - t.position + 1;
        });
      },

      addVariant(traitId, variantData) {
        const trait = this.traits.find(t => t.id === traitId);
        if (!trait) return;
        const newVariant = {
          id: generateId(),
          name: variantData.name,
          url: variantData.url,
          chance: variantData.chance || 0.5,
          createdAt: Date.now()
        };
        trait.variants.push(newVariant);
        return newVariant;
      },

      removeVariant(traitId, variantId) {
        const trait = this.traits.find(t => t.id === traitId);
        if (!trait) return;
        const variantIndex = trait.variants.findIndex(v => v.id === variantId);
        if (variantIndex === -1) return;
        trait.variants.splice(variantIndex, 1);
        if (trait.selected >= trait.variants.length) {
          trait.selected = Math.max(0, trait.variants.length - 1);
        }
      },

      updateVariantChance(traitId, variantId, chance) {
        const trait = this.traits.find(t => t.id === traitId);
        if (!trait) return;
        const variant = trait.variants.find(v => v.id === variantId);
        if (!variant) return;
        variant.chance = chance;
      },

      getTrait(traitId) {
        return this.traits.find(t => t.id === traitId);
      },

      getAllTraits() {
        return [...this.traits];
      }
    };






    /* Section 3 - GLOBAL SETUP AND PANEL INITIALIZATION */





    let provider, contract, signer, contractWithSigner;
    let traitImages = [];
    let isDragging = false;
    let currentImage = null;
    let offsetX = 0;
    let offsetY = 0;
    let moveInterval = null;
    let variantHistories = {};
    let timerInterval = null;
    let lastUndoTime = 0;
    let autoPositioned = new Array(20).fill(false);
    let sampleData = Array(16).fill(null).map(() => []);
    const clickSound = new Audio('https://www.soundjay.com/buttons/button-3.mp3');
    clickSound.volume = 0.25;

    const panelManager = new PanelManager();

    const logoPanel = new Panel('logo-panel', '', 
      `<img id="logo" src="https://github.com/geoffmccabe/AIFN1-nft-minting/raw/main/images/Perceptrons_Logo_Perc_Creator_600px.webp" alt="Perceptrons Logo" width="600">`,
      'left'
    );

    const traitsPanel = new Panel('traits-panel', 'Traits Manager', 
      `<div id="trait-container"></div>`,
      'left'
    );

    const previewPanel = new Panel('preview-panel', 'Preview', 
      `<div id="preview"></div>
       <div id="controls">
         <span id="coordinates"><strong>Coordinates:</strong> (1, 1)</span>
         <span>   </span>
         <span class="direction-emoji" data-direction="up">⬆️</span>
         <span class="direction-emoji" data-direction="down">⬇️</span>
         <span class="direction-emoji" data-direction="left">⬅️</span>
         <span class="direction-emoji" data-direction="right">➡️</span>
         <span class="magnify-emoji">🔍</span>
       </div>
       <div id="enlarged-preview"></div>`,
      'right'
    );

    const previewSamplesPanel = new Panel('preview-samples-panel', 'Preview Samples', 
      `<div id="preview-samples">
         <div id="preview-samples-header">
           <button id="update-previews">UPDATE</button>
         </div>
         <div id="preview-samples-grid"></div>
       </div>`,
      'right'
    );

    const backgroundPanel = new Panel('background-panel', 'AI Background', 
      `<div id="prompt-section">
         <label for="base-prompt">Basic Prompt:</label>
         <textarea id="base-prompt" readonly>1girl, shiyang, ((((small breasts)))), (white skull belt buckle, front hair locks, black flat dragon tattoo on right shoulder, black flat dragon tattoo on right arm, red clothes, shoulder tattoo,:1.1), golden jewelry, long hair, earrings, black hair, golden hoop earrings, clothing cutout, ponytail, cleavage cutout, cleavage, bracelet, midriff, cheongsam top, red choli top, navel, makeup, holding, pirate pistol, lips, pirate gun, black shorts, looking at viewer, dynamic pose, ((asian girl)), action pose, (white skull belt buckle), black dragon tattoo on right shoulder, black dragon tattoo on right arm, ((shoulder tattoo))</textarea>
         <label for="user-prompt">User Prompt:</label>
         <textarea id="user-prompt" placeholder="Add your custom prompt (e.g., 'with a cyberpunk city background')"></textarea>
       </div>
       <button id="generate-background">Generate Bkgd</button>
       <div id="background-details">
         <img id="background-image" src="https://github.com/geoffmccabe/AIFN1-nft-minting/raw/main/images/Preview_Panel_Bkgd_600px.webp" alt="AI Background">
         <p id="background-metadata">Loading...</p>
       </div>`,
      'left'
    );

    const mintingPanel = new Panel('minting-panel', 'Minting', 
      `<div id="mint-section">
         <button id="mintButton" disabled>Mint NFT</button>
         <div id="mintFeeDisplay">Mint Fee: Loading...</div>
       </div>`,
      'right'
    );

    function setupUndoListener() {
      document.addEventListener('keydown', (e) => {
        const now = Date.now();
        if (now - lastUndoTime < 300) return;
        lastUndoTime = now;
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          e.preventDefault();
          if (!currentImage) return;
          const traitIndex = traitImages.indexOf(currentImage);
          const trait = TraitManager.getAllTraits()[traitIndex];
          const variationName = trait.variants[trait.selected].name;
          const key = `${trait.id}-${variationName}`;
          if (variantHistories[key] && variantHistories[key].length > 1) {
            variantHistories[key].pop();
            const previousPosition = variantHistories[key][variantHistories[key].length - 1];
            currentImage.style.left = `${previousPosition.left}px`;
            currentImage.style.top = `${previousPosition.top}px`;
            try {
              localStorage.setItem(`trait${trait.id}-${variationName}-position`, JSON.stringify(previousPosition));
            } catch (e) {
              console.error('Failed to save to localStorage:', e);
            }
            updateCoordinates(currentImage, document.getElementById('coordinates'));
            updateSamplePositions(trait.id, trait.variants[trait.selected].id, previousPosition);
            updateSubsequentTraits(trait.id, variationName, previousPosition);
          }
        }
      });
    }

    document.addEventListener('DOMContentLoaded', () => {
      provider = new ethers.providers.Web3Provider(window.ethereum);
      contract = new ethers.Contract(config.sepolia.contractAddress, config.abi, provider);
      signer = provider.getSigner();
      contractWithSigner = contract.connect(signer);

      panelManager.addPanel(logoPanel);
      panelManager.addPanel(traitsPanel);
      panelManager.addPanel(backgroundPanel);
      panelManager.addPanel(previewPanel);
      panelManager.addPanel(previewSamplesPanel);
      panelManager.addPanel(mintingPanel);

      TraitManager.initialize();
      traitsPanel.update(getTraitsContent());
      previewSamplesPanel.update(getPreviewSamplesContent());
      fetchMintFee();

      document.getElementById('generate-background').addEventListener('click', fetchBackground);
      document.getElementById('mintButton').addEventListener('click', window.mintNFT);

      setupPreviewListeners();
      setupUndoListener();

      TraitManager.getAllTraits().forEach(trait => {
        if (trait.variants.length > 0) {
          selectVariation(trait.id, trait.variants[0].id);
        }
      });

      panelManager.panels.forEach(panel => panelManager.setupDrag(panel));
      traitImages.forEach((img, index) => setupDragAndDrop(img, index));
    });





   <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mint Your AIFN NFT</title>
  <link rel="icon" type="image/x-icon" href="/AIFN1-nft-minting/favicon.ico">
  <link href="https://fonts.googleapis.com/css2?family=Rowdies:wght@300;400;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
  <script defer src="https://unpkg.com/ethers@5.7.2/dist/ethers.umd.min.js"></script>
  <script defer src="config.js"></script>
  <script defer src="entry.js"></script>
</head>

<style>
  body {
    font-family: 'Poppins', sans-serif;
    background-image: url('/AIFN1-nft-minting/images/background.webp');
    background-repeat: repeat-y;
    background-position: center top;
    background-size: 100% auto;
    color: black;
    padding: 20px;
    margin: 0;
    position: relative;
    min-height: 100vh;
    display: flex;
  }
  #version {
    position: absolute;
    top: 10px;
    left: 10px;
    font-size: 12px;
    color: #333;
    z-index: 10;
  }
  #left-column {
    flex: 2;
    padding-right: 20px;
    padding-top: 30px;
    display: flex;
    flex-direction: column;
    max-width: 60%;
    width: 60%;
    box-sizing: border-box;
    overflow: hidden;
  }
  #right-column {
    flex: 1;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    max-width: 40%;
    width: 40%;
    box-sizing: border-box;
    overflow: hidden;
  }
  .panel {
    background-color: rgba(255, 255, 255, 0.6);
    border-radius: 10px;
    padding: 10px;
    border: 1px solid #ccc;
    box-sizing: border-box;
    margin-bottom: 20px;
    position: relative;
    width: 100%;
  }
  .panel-top-bar {
    width: 100%;
    height: 10px;
    background-color: #ccc;
    cursor: grab;
  }
  .panel h2 {
    font-family: 'Rowdies', sans-serif;
    font-weight: 400;
    font-size: 12px;
    color: #cbcccb;
    margin: 0 0 10px;
    text-align: center;
    position: relative;
    top: 0;
    left: 0;
    transform: none;
    width: 100%;
  }
  #logo-panel {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    width: 100%;
  }
  #logo {
    display: block;
    width: auto;
    height: auto;
    max-width: 600px;
    max-height: 100%;
  }
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    #logo { max-width: 300px; }
  }
  .trait-section {
    margin-bottom: 20px;
    margin-top: 30px;
    position: relative;
    z-index: 1;
  }
  .trait-header {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    justify-content: space-between;
  }
  .trait-controls {
    display: flex;
    gap: 10px;
    position: relative;
    z-index: 2;
  }
  .trait-controls span {
    cursor: pointer;
    font-size: 16px;
    color: #666;
  }
  .trait-controls span:hover {
    opacity: 0.8;
  }
  .trait-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 10px;
    margin-top: 10px;
  }
  .variation-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
  }
  .variation-image-wrapper {
    width: 110px;
    height: 110px;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .variation-image-wrapper.selected {
    border: 5px solid #f4c149;
  }
  .variation {
    width: 100px;
    height: 100px;
    object-fit: contain;
  }
  .variation-filename {
    font-size: 8px;
    text-align: center;
    margin-top: 5px;
    word-break: break-all;
  }
  input[type="text"] {
    width: 100%;
    padding: 5px;
    border-radius: 5px;
    border: 1px solid #ccc;
    margin-bottom: 5px;
    box-sizing: border-box;
    height: 32px;
    font-size: 16px;
    display: block;
  }
  input[type="text"]::placeholder {
    color: #ccc;
  }
  input[type="text"]:not(:placeholder-shown) {
    color: black;
  }
  input[type="file"] {
    display: none;
  }
  .file-input-label {
    display: inline-block;
    padding: 5px 10px;
    background: #ccc;
    color: black;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
    margin-bottom: 5px;
    height: 32px;
    line-height: 22px;
    box-sizing: border-box;
    text-align: center;
    min-width: 120px;
    width: auto;
    white-space: nowrap;
    vertical-align: middle;
    position: relative;
    z-index: 3;
  }
  .file-input-label:hover {
    background: #bbb;
  }
  .up-arrow:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    top: -30px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 1000;
  }
  .up-arrow:hover::before {
    content: '';
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #333;
    z-index: 1000;
  }
  .down-arrow:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    top: -30px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 1000;
  }
  .down-arrow:hover::before {
    content: '';
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #333;
    z-index: 1000;
  }
  #preview {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    margin-bottom: 10px;
    overflow: hidden;
    border-radius: 15px;
    background: transparent; /* Let SampleRenderer handle the background */
  }
  #preview img {
    position: absolute;
    object-fit: contain;
  }
  #preview img.dragging {
    box-shadow: 0 0 3px 2px rgba(255, 255, 255, 0.5);
  }
  #controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin-top: 5px;
    width: 100%;
    position: relative;
    z-index: 1;
  }
  #coordinates {
    font-size: 14px;
  }
  #coordinates strong {
    font-weight: bold;
  }
  .direction-emoji, .magnify-emoji {
    font-size: 16px;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    color: #666;
  }
  .direction-emoji:hover, .magnify-emoji:hover {
    opacity: 0.8;
  }
  #enlarged-preview {
    display: none;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border: 1px solid black;
    z-index: 1000;
    overflow: hidden;
    background: transparent; /* Let SampleRenderer handle the background */
  }
  #enlarged-preview img {
    position: absolute;
    object-fit: contain;
  }
  #preview-samples-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: 13px;
    width: 100%;
  }
  #preview-samples-grid .sample-container {
    position: relative;
    width: 100%;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    cursor: pointer;
    border-radius: 5px;
    background: transparent; /* Let SampleRenderer handle the background */
  }
  #preview-samples-grid img {
    position: absolute;
    transform-origin: top left;
  }
  #update-previews {
    padding: 5px 10px;
    background: #ccc;
    color: black;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 14px;
  }
  #update-previews:hover {
    background: #bbb;
  }
  #prompt-section {
    margin-top: 10px;
  }
  #prompt-section textarea {
    width: 100%;
    height: 140px;
    resize: none;
    border-radius: 5px;
    border: 1px solid #ccc;
  }
  #prompt-section label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }
  #background-details {
    text-align: center;
  }
  #background-image {
    width: 100%;
    height: 600px;
    background: url('https://github.com/geoffmccabe/AIFN1-nft-minting/raw/main/images/Preview_Panel_Bkgd_600px.webp');
    background-size: cover;
  }
  button {
    padding: 10px 20px;
    background: grey;
    color: black;
    border: none;
    cursor: pointer;
    font-size: 16px;
    border-radius: 5px;
    margin: 10px 0;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  button:not(:disabled) {
    background: #4CAF50;
  }
  #mint-section {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  #mintFeeDisplay {
    font-size: 14px;
  }
  .confirmation-dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 5px;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  .confirmation-dialog p {
    margin: 0 0 10px;
    text-align: center;
  }
  .confirmation-dialog .buttons {
    display: flex;
    justify-content: center;
    gap: 10px;
  }
  .confirmation-dialog button {
    padding: 5px 10px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }
  .confirmation-dialog .yes-button {
    background: #739c6c;
  }
  .confirmation-dialog .no-button {
    background: #ae645a;
  }
  @media (max-width: 900px) {
    body { flex-direction: column; padding: 10px; }
    #left-column, #right-column { flex: none; width: 100%; max-width: 100%; padding: 0; }
    #preview, #background-image { height: auto; aspect-ratio: 1 / 1; }
    #preview-samples-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
    .panel { width: 100% !important; }
  }
</style>

<body>
  <div id="version">





    /* Section 7 - BACKGROUND AND MINTING LOGIC */





    async function fetchBackground() {
      try {
        clickSound.play().catch(error => console.error('Error playing click sound:', error));
        let seconds = 0;
        const generateButton = document.getElementById('generate-background');
        generateButton.disabled = true;
        generateButton.innerText = `Processing ${seconds}...`;
        timerInterval = setInterval(() => {
          seconds++;
          generateButton.innerText = `Processing ${seconds}...`;
        }, 1000);

        const userPrompt = document.getElementById('user-prompt').value.trim();
        const url = `https://aifn-1-api-q1ni.vercel.app/api/generate-background${userPrompt ? `?prompt=${encodeURIComponent(userPrompt)}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch background: ${response.statusText}`);
        const data = await response.json();
        backgroundPanel.update(
          backgroundPanel.content.replace(
            /<img id="background-image"[^>]+>/,
            `<img id="background-image" src="${data.imageUrl}" alt="AI Background">`
          ).replace(
            /<p id="background-metadata">[^<]+<\/p>/,
            `<p id="background-metadata">${data.metadata}</p>`
          )
        );
      } catch (error) {
        console.error('Error fetching background:', error);
        backgroundPanel.update(
          backgroundPanel.content.replace(
            /<img id="background-image"[^>]+>/,
            `<img id="background-image" src="https://github.com/geoffmccabe/AIFN1-nft-minting/raw/main/images/Preview_Panel_Bkgd_600px.webp" alt="AI Background">`
          ).replace(
            /<p id="background-metadata">[^<]+<\/p>/,
            `<p id="background-metadata">Failed to load background: ${error.message}</p>`
          )
        );
      } finally {
        clearInterval(timerInterval);
        const generateButton = document.getElementById('generate-background');
        generateButton.innerText = 'Generate Bkgd';
        generateButton.disabled = false;
      }
    }

    function fetchMintFee() {
      const mintFeeDisplay = document.getElementById('mintFeeDisplay');
      if (mintFeeDisplay) mintFeeDisplay.innerText = `Mint Fee: 0.001 ETH (Mock)`;
    }

    function updateMintButton() {
      const allTraitsSet = TraitManager.getAllTraits().every(trait => trait.name && trait.variants.length > 0);
      const mintBtn = document.getElementById('mintButton');
      if (mintBtn) {
        mintBtn.disabled = !allTraitsSet;
      }
    }

    function updateSubsequentTraits(currentTraitId, currentVariationName, position) {
      const currentTrait = TraitManager.getTrait(currentTraitId);
      const currentTraitIndex = TraitManager.getAllTraits().findIndex(t => t.id === currentTraitId);
      const currentVariationIndex = currentTrait.variants.findIndex(v => v.name === currentVariationName);

      if (currentTrait.variants.length > 1) {
        for (let i = currentVariationIndex + 1; i < currentTrait.variants.length; i++) {
          const nextVariationName = currentTrait.variants[i].name;
          const key = `${currentTraitId}-${nextVariationName}`;
          const manuallyMoved = localStorage.getItem(`trait${currentTraitId}-${nextVariationName}-manuallyMoved`);
          if (!manuallyMoved && !variantHistories[key]) {
            variantHistories[key] = [{ left: position.left, top: position.top }];
            try {
              localStorage.setItem(`trait${currentTraitId}-${nextVariationName}-position`, JSON.stringify(position));
            } catch (e) {
              console.error('Failed to save to localStorage:', e);
            }
            if (currentTrait.selected === i) {
              const previewImage = document.getElementById(`preview-trait${currentTraitId}`);
              if (previewImage && previewImage.src) {
                const previewWidth = document.getElementById('preview').clientWidth;
                const scale = previewWidth / 600;
                previewImage.style.left = `${position.left * scale}px`;
                previewImage.style.top = `${position.top * scale}px`;
              }
            }
          }
        }
      }

      for (let traitIndex = currentTraitIndex + 1; traitIndex < TraitManager.getAllTraits().length; traitIndex++) {
        const nextTrait = TraitManager.getAllTraits()[traitIndex];
        if (nextTrait.variants.length === 0) continue;
        for (let i = 0; i < nextTrait.variants.length; i++) {
          const nextVariationName = nextTrait.variants[i].name;
          const key = `${nextTrait.id}-${nextVariationName}`;
          const manuallyMoved = localStorage.getItem(`trait${nextTrait.id}-${nextVariationName}-manuallyMoved`);
          if (!manuallyMoved && !variantHistories[key]) {
            variantHistories[key] = [{ left: position.left, top: position.top }];
            try {
              localStorage.setItem(`trait${nextTrait.id}-${nextVariationName}-position`, JSON.stringify(position));
            } catch (e) {
              console.error('Failed to save to localStorage:', e);
            }
            if (nextTrait.selected === i) {
              const previewImage = document.getElementById(`preview-trait${nextTrait.id}`);
              if (previewImage && previewImage.src) {
                const previewWidth = document.getElementById('preview').clientWidth;
                const scale = previewWidth / 600;
                previewImage.style.left = `${position.left * scale}px`;
                previewImage.style.top = `${position.top * scale}px`;
              }
            }
          }
        }
      }
    }

    function updateSamplePositions(traitId, variationId, position) {
      for (let i = 0; i < 16; i++) {
        const sample = sampleData[i];
        for (let j = 0; j < sample.length; j++) {
          if (sample[j].traitId === traitId && sample[j].variantId === variationId) {
            sample[j].position = position;
          }
        }
      }
      updatePreviewSamples();
    }

    window.mintNFT = async function() {
      const status = document.getElementById('status') || document.createElement('div');
      status.id = 'status';
      mintingPanel.element.appendChild(status);

      try {
        await provider.send("eth_requestAccounts", []);
        const numTraitCategories = TraitManager.getAllTraits().length;
        const traitCategoryVariants = TraitManager.getAllTraits().map(trait => trait.variants.length);
        const traitIndices = TraitManager.getAllTraits().map(trait => trait.selected);
        const recipient = await signer.getAddress();

        status.innerText = "Uploading images to Arweave...";
        const formData = new FormData();
        for (let i = 0; i < TraitManager.getAllTraits().length; i++) {
          const trait = TraitManager.getAllTraits()[i];
          const selectedVariation = trait.variants[trait.selected];
          const response = await fetch(selectedVariation.url);
          const blob = await response.blob();
          formData.append('images', blob, `${trait.name}-${selectedVariation.name}.png`);
        }

        const uploadResponse = await fetch('https://aifn-1-api-q1ni.vercel.app/api/upload-to-arweave', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadResponse.json();
        if (uploadData.error) throw new Error(uploadData.error);

        const arweaveUrls = uploadData.transactionIds.map(id => `https://arweave.net/${id}`);

        status.innerText = "Estimating gas...";
        const gasLimit = await contractWithSigner.estimateGas.mintNFT(
          recipient,
          initialHtmlUri,
          numTraitCategories,
          traitCategoryVariants,
          traitIndices,
          { value: ethers.utils.parseEther(config.sepolia.mintFee) }
        );

        status.innerText = "Minting...";
        const tx = await contractWithSigner.mintNFT(
          recipient,
          initialHtmlUri,
          numTraitCategories,
          traitCategoryVariants,
          traitIndices,
          { value: ethers.utils.parseEther(config.sepolia.mintFee), gasLimit: gasLimit.add(50000) }
        );
        const receipt = await tx.wait();
        const tokenId = receipt.events.find(e => e.event === "Transfer").args.tokenId.toString();
        status.innerText = `Minted! Token ID: ${tokenId}`;
      } catch (error) {
        status.innerText = `Error: ${error.message}`;
      }
    };





/* Section 8 - SAMPLE RENDERER */





    function SampleRenderer(container, width, images, scaleRelativeTo = 600) {
      const scale = width / scaleRelativeTo;
      container.style.width = `${width}px`;
      container.style.height = `${width}px`;
      container.style.background = `url('https://github.com/geoffmccabe/AIFN1-nft-minting/raw/main/images/Preview_Panel_Bkgd_600px.webp')`;
      container.style.backgroundSize = 'cover';

      images.forEach(({ img, position, zIndex }) => {
        if (img && img.src && img.style.visibility !== 'hidden') {
          const clonedImg = img.cloneNode(true);
          clonedImg.style.width = `${img.width * scale}px`;
          clonedImg.style.height = `${img.height * scale}px`;
          clonedImg.style.left = `${position.left * scale}px`;
          clonedImg.style.top = `${position.top * scale}px`;
          clonedImg.style.zIndex = String(zIndex);
          clonedImg.style.visibility = 'visible';
          container.appendChild(clonedImg);
        }
      });
    }

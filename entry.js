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
    this.style = { ...style };
    this.element = null;
  }

  applyLogoCenteringStyles() {
    if (this.id === 'logo-panel' && this.element) {
        Object.assign(this.element.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '200px', padding: '0'
        });
        const logoImg = this.element.querySelector('#logo');
        if (logoImg) {
            Object.assign(logoImg.style, {
                margin: 'auto',
                // *** FIX for Issue 1: Logo Size ***
                maxWidth: '600px',   // Explicit max width
                maxHeight: '100%',  // Max height relative to parent (200px)
                width: 'auto',      // Maintain aspect ratio
                height: 'auto',     // Maintain aspect ratio
                display: 'block'    // Helps margin:auto work reliably
            });
        }
    }
  }

  render() {
    this.element = document.createElement('div');
    this.element.id = this.id;
    this.element.className = 'panel';

    const header = this.id === 'logo-panel' ? '' : `<div class="panel-top-bar"></div><h2>${this.title}</h2>`;
    this.element.innerHTML = header + this.content;

    Object.assign(this.element.style, { ...this.style, position: 'relative', cursor: 'default' });
    this.applyLogoCenteringStyles();

    return this.element;
  }

  update(content) {
    if (this.element) {
      const header = this.id === 'logo-panel' ? '' : `<div class="panel-top-bar"></div><h2>${this.title}</h2>`;
      this.element.innerHTML = header + (content || this.content);
      Object.assign(this.element.style, { position: 'relative', cursor: 'default' });
      this.applyLogoCenteringStyles();
    }
  }

  setColumn(column) {
    this.column = column;
  }
}

class PanelManager {
  constructor() {
    this.panels = [];
    // State for dragging/resizing
    this.boundHandleMouseMove = null;
    this.boundHandleMouseUp = null;
    this.draggedElement = null;
    this.isResizingColumns = false; // Flag for column resize
    this.initialColumnWidths = null; // To store widths at resize start
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
    if (!leftColumn || !rightColumn) return;

    const scrollTops = { left: leftColumn.scrollTop, right: rightColumn.scrollTop };
    leftColumn.innerHTML = ''; rightColumn.innerHTML = ''; // Clear

    // *** NEW FEATURE: Set initial column widths if not resizing ***
    if (!this.isResizingColumns) {
        // Set initial widths (can be adjusted)
        leftColumn.style.width = '66.67%';
        rightColumn.style.width = '33.33%';
    }

    const leftFrag = document.createDocumentFragment();
    const rightFrag = document.createDocumentFragment();

    this.panels.forEach(panel => {
      panel.element = panel.render();
      if (!panel.element) return;
      if (panel.column === 'left') { leftFrag.appendChild(panel.element); }
      else { rightFrag.appendChild(panel.element); }
      // Setup both panel drag and column resize listeners
      this.setupPanelActions(panel);
    });

    leftColumn.appendChild(leftFrag);
    rightColumn.appendChild(rightFrag);
    leftColumn.scrollTop = scrollTops.left;
    rightColumn.scrollTop = scrollTops.right;

    this.reAttachDynamicListeners();
  }

  reAttachDynamicListeners() {
    console.log("Re-attaching dynamic listeners...");
    // --- Preview Panel Listeners ---
    const previewPanel = this.panels.find(p => p.id === 'preview-panel');
    if (previewPanel && previewPanel.element && document.contains(previewPanel.element)) {
        setupPreviewListeners(previewPanel.element);
    }

    // --- Traits Panel Listeners ---
    const traitsPanel = this.panels.find(p => p.id === 'traits-panel');
    if (traitsPanel && traitsPanel.element && document.contains(traitsPanel.element)) {
        // *** FIX for Issue 2: Traits Disappearing ***
        // Explicitly update content before setting listeners
        console.log("Updating traits panel content before setting listeners.");
        try {
             traitsPanel.update(getTraitsContent()); // Ensure content is present
             TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
        } catch (error) {
            console.error("Error during traits panel update/listener setup:", error);
        }
    }

    // --- Other Panels ---
    // (Simplified re-attachment logic from previous example)
    this.panels.forEach(panel => {
        if (!panel.element || !document.contains(panel.element)) return;
        // Re-attach listeners for specific elements within known panels
        if (panel.id === 'preview-samples-panel') {
            const updateBtn = panel.element.querySelector('#update-previews');
            if (updateBtn && !updateBtn.hasAttribute('data-listener')) {
                 updateBtn.addEventListener('click', updatePreviewSamples); updateBtn.setAttribute('data-listener', 'true');
            }
            panel.element.querySelectorAll('#preview-samples-grid .sample-container').forEach((c,i) => {
                if (!c.hasAttribute('data-listener')) {
                     c.addEventListener('click', () => { if (sampleData[i]) sampleData[i].forEach(s => selectVariation(s.traitId, s.variantId)); }); c.setAttribute('data-listener', 'true');
                }
            });
        } else if (panel.id === 'background-panel') {
            const genBgBtn = panel.element.querySelector('#generate-background');
            if (genBgBtn && !genBgBtn.hasAttribute('data-listener')) {
                genBgBtn.addEventListener('click', fetchBackground); genBgBtn.setAttribute('data-listener', 'true');
            }
        } else if (panel.id === 'minting-panel') {
             const mintBtn = panel.element.querySelector('#mintButton');
             if (mintBtn && !mintBtn.hasAttribute('data-listener')) {
                 mintBtn.addEventListener('click', window.mintNFT); mintBtn.setAttribute('data-listener', 'true');
             }
        }
    });
    console.log("Finished re-attaching dynamic listeners.");
  }


  // Combined setup for panel actions (drag panel, resize columns)
  setupPanelActions(panel) {
    const el = panel.element;
    if (!el || el.hasAttribute('data-action-listener')) return;

    let actionType = null; // 'drag', 'resize', or null
    let offsetX = 0, offsetY = 0; // For panel drag
    let initialMouseX = 0; // For resize

    // --- MOUSE DOWN --- determines action type ---
    const handleMouseDown = (e) => {
      actionType = null; // Reset action type
      const rect = el.getBoundingClientRect();
      const clickXRelative = e.clientX - rect.left;
      const clickYRelative = e.clientY - rect.top;

      // Check for Panel Drag First (Top 10px takes precedence)
      const isLogoPanel = el.id === 'logo-panel';
      const isTopBarClick = e.target.classList.contains('panel-top-bar');
      const isLogoTopAreaClick = isLogoPanel && clickYRelative >= 0 && clickYRelative <= 10;

      if (isTopBarClick || isLogoTopAreaClick) {
          actionType = 'drag';
          console.log(`Mousedown: Action=drag on ${el.id}`);
      } else {
          // Check for Column Resize
          const resizeZone = 6; // 6px grab area
          if (panel.column === 'left' && clickXRelative >= rect.width - resizeZone && clickXRelative <= rect.width) {
              actionType = 'resize';
              console.log(`Mousedown: Action=resize on left panel ${el.id}`);
          } else if (panel.column === 'right' && clickXRelative >= 0 && clickXRelative <= resizeZone) {
              actionType = 'resize';
              console.log(`Mousedown: Action=resize on right panel ${el.id}`);
          }
      }

      // If no action determined, do nothing
      if (!actionType) {
           console.log(`Mousedown: No action on ${el.id}`);
           return;
      }

      e.preventDefault(); // Prevent default for either action

      // --- Initialize Action ---
      if (actionType === 'drag') {
          this.isResizingColumns = false; // Ensure resize flag is off
          isDragging = true;
          this.draggedElement = el;
          offsetX = e.clientX - rect.left;
          offsetY = e.clientY - rect.top;
          Object.assign(el.style, { // Drag styles
              position: 'absolute', left: `${rect.left}px`, top: `${rect.top}px`,
              width: `${rect.width}px`, height: `${rect.height}px`,
              zIndex: '1000', cursor: 'grabbing', opacity: '0.8',
              boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
          });
      } else if (actionType === 'resize') {
          isDragging = false; // Ensure drag flag is off
          this.isResizingColumns = true;
          initialMouseX = e.clientX;
          const leftCol = document.getElementById('left-column');
          const rightCol = document.getElementById('right-column');
          // Store initial widths as percentages
          this.initialColumnWidths = {
              left: parseFloat(leftCol.style.width || '66.67'),
              right: parseFloat(rightCol.style.width || '33.33')
          };
          // Add visual indicator for resizing
          document.body.style.cursor = 'col-resize';
      }

      // --- Add Global Listeners ---
      // Bind move/up handlers
      this.boundHandleMouseMove = handleMouseMove.bind(this);
      this.boundHandleMouseUp = handleMouseUp.bind(this);
      // Add listeners
      document.addEventListener('mousemove', this.boundHandleMouseMove);
      document.addEventListener('mouseup', this.boundHandleMouseUp);
    }; // End handleMouseDown

    // --- MOUSE MOVE --- handles active action ---
    const handleMouseMove = (e) => {
      e.preventDefault(); // Prevent selection during move
      if (actionType === 'drag') {
          if (!this.draggedElement) return;
          this.draggedElement.style.left = `${e.clientX - offsetX}px`;
          this.draggedElement.style.top = `${e.clientY - offsetY}px`;
      } else if (actionType === 'resize') {
          if (!this.isResizingColumns) return;
          const leftCol = document.getElementById('left-column');
          const rightCol = document.getElementById('right-column');
          if (!leftCol || !rightCol || !this.initialColumnWidths) return;

          const deltaX = e.clientX - initialMouseX;
          const totalWidth = leftCol.parentElement.clientWidth; // Use body or container width
          const minWidthPx = 50; // Minimum column width in pixels

          // Calculate new width based on delta, converting px delta to percentage
          let newLeftWidthPercent = this.initialColumnWidths.left + (deltaX / totalWidth) * 100;

          // Constrain percentages (e.g., between 10% and 90%)
          const minPercent = (minWidthPx / totalWidth) * 100;
          const maxPercent = 100 - minPercent;
          newLeftWidthPercent = Math.max(minPercent, Math.min(newLeftWidthPercent, maxPercent));

          const newRightWidthPercent = 100 - newLeftWidthPercent;

          leftCol.style.width = `${newLeftWidthPercent}%`;
          rightCol.style.width = `${newRightWidthPercent}%`;
      }
    }; // End handleMouseMove

    // --- MOUSE UP --- cleans up active action ---
    const handleMouseUp = (e) => {
      if (actionType === 'drag') {
          if (!this.draggedElement) return;
          const droppedElement = this.draggedElement;
          isDragging = false;
          this.draggedElement = null;
          console.log(`Mouseup: Dropped panel ${droppedElement.id}`);

          // Clear inline styles
          droppedElement.style.cursor = ''; droppedElement.style.zIndex = '';
          droppedElement.style.opacity = ''; droppedElement.style.position = '';
          droppedElement.style.left = ''; droppedElement.style.top = '';
          droppedElement.style.width = ''; droppedElement.style.height = '';
          droppedElement.style.boxShadow = '';

          // --- Determine Drop Location & Reorder ---
          const dropX = e.clientX; const windowWidth = window.innerWidth;
          const newColumn = dropX < windowWidth / 2 ? 'left' : 'right';
          const droppedPanelObject = this.panels.find(p => p.element === droppedElement);
          if (!droppedPanelObject) return;
          droppedPanelObject.setColumn(newColumn);

          const dropY = e.clientY;
          const targetColumnElement = document.getElementById(newColumn === 'left' ? 'left-column' : 'right-column');
          if (!targetColumnElement) return;

          const siblingsInColumn = Array.from(targetColumnElement.children);
          let insertBeforeElement = null;
          for (const sibling of siblingsInColumn) {
              if (sibling === droppedElement) continue;
              const rect = sibling.getBoundingClientRect();
              if (dropY < rect.top + rect.height / 2) { insertBeforeElement = sibling; break; }
          }

          const currentPanelIndex = this.panels.findIndex(p => p === droppedPanelObject);
          if (currentPanelIndex > -1) { this.panels.splice(currentPanelIndex, 1); }

          let insertAtIndex = -1;
          if (insertBeforeElement) {
              const insertBeforePanelObj = this.panels.find(p => p.element === insertBeforeElement);
              if (insertBeforePanelObj) { insertAtIndex = this.panels.findIndex(p => p === insertBeforePanelObj); }
          }
          if (insertAtIndex !== -1) {
              this.panels.splice(insertAtIndex, 0, droppedPanelObject);
          } else {
              let lastPanelInColumnIndex = -1;
              for (let i = this.panels.length - 1; i >= 0; i--) {
                  if (this.panels[i].column === newColumn) { lastPanelInColumnIndex = i; break; }
              }
              this.panels.splice(lastPanelInColumnIndex + 1, 0, droppedPanelObject);
          }
          this.renderAll(); // Re-render

      } else if (actionType === 'resize') {
          console.log("Mouseup: Finished resizing columns.");
          this.isResizingColumns = false;
          this.initialColumnWidths = null;
          document.body.style.cursor = ''; // Reset body cursor
      }

      // Remove global listeners regardless of action type
      if (this.boundHandleMouseMove) {
          document.removeEventListener('mousemove', this.boundHandleMouseMove);
          this.boundHandleMouseMove = null;
      }
      if (this.boundHandleMouseUp) {
          document.removeEventListener('mouseup', this.boundHandleMouseUp);
          this.boundHandleMouseUp = null;
      }
      actionType = null; // Reset action type
    }; // End handleMouseUp

    // --- Attach Listener ---
    // Use a flag attribute to prevent double-listening if setup is called again
    el.removeEventListener('mousedown', handleMouseDown); // Clean first
    el.addEventListener('mousedown', handleMouseDown);
    el.setAttribute('data-action-listener', 'true');
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
    let traitImages = []; // Stores references to preview img elements for traits
    let isDragging = false; // Global flag for dragging trait images in preview
    let currentImage = null; // Reference to the trait image currently being interacted with/dragged
    let offsetX = 0; // For trait image dragging
    let offsetY = 0; // For trait image dragging
    let moveInterval = null; // Interval ID for arrow key movement
    let variantHistories = {}; // Stores position history: { "traitId-variantName": [{left, top}, ...] }
    let timerInterval = null; // Interval ID for background generation timer
    let lastUndoTime = 0; // Debounce undo
    let autoPositioned = new Array(20).fill(false); // Tracks if subsequent variants were auto-positioned
    let sampleData = Array(16).fill(null).map(() => []); // Data for the 16 preview samples
    const clickSound = new Audio('https://www.soundjay.com/buttons/button-3.mp3'); // UI sound
    clickSound.volume = 0.25;

    const panelManager = new PanelManager(); // Instantiate the manager

    // --- Define Panels ---
    const logoPanel = new Panel('logo-panel', '', // No title for logo panel
      `<img id="logo" src="https://github.com/geoffmccabe/AIFN1-nft-minting/raw/main/images/Perceptrons_Logo_Perc_Creator_600px.webp" alt="Perceptrons Logo">`,
      'left' // Initial column
    );

    const traitsPanel = new Panel('traits-panel', 'Traits Manager',
      `<div id="trait-container"></div>`, // Placeholder for dynamic content
      'left'
    );

    const previewPanel = new Panel('preview-panel', 'Preview',
      `<div id="preview"></div>
       <div id="controls">
         <span id="coordinates"><strong>Coordinates:</strong> (0, 0)</span>
         <span>&nbsp;&nbsp;</span>          <span class="direction-emoji" data-direction="up" title="Move Up">⬆️</span>
         <span class="direction-emoji" data-direction="down" title="Move Down">⬇️</span>
         <span class="direction-emoji" data-direction="left" title="Move Left">⬅️</span>
         <span class="direction-emoji" data-direction="right" title="Move Right">➡️</span>
         <span class="magnify-emoji" title="Enlarge Preview">🔍</span>
       </div>
       <div id="enlarged-preview"></div>`, // Placeholder for enlarged view
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
         <label for="base-prompt">Base Prompt:</label>
         <textarea id="base-prompt" readonly>1girl, shiyang, ((((small breasts)))), (white skull belt buckle, front hair locks, black flat dragon tattoo on right shoulder, black flat dragon tattoo on right arm, red clothes, shoulder tattoo,:1.1), golden jewelry, long hair, earrings, black hair, golden hoop earrings, clothing cutout, ponytail, cleavage cutout, cleavage, bracelet, midriff, cheongsam top, red choli top, navel, makeup, holding, pirate pistol, lips, pirate gun, black shorts, looking at viewer, dynamic pose, ((asian girl)), action pose, (white skull belt buckle), black dragon tattoo on right shoulder, black dragon tattoo on right arm, ((shoulder tattoo))</textarea>
         <label for="user-prompt">User Prompt:</label>
         <textarea id="user-prompt" placeholder="Add your custom prompt (e.g., 'with a cyberpunk city background')"></textarea>
       </div>
       <button id="generate-background">Generate Bkgd</button>
       <div id="background-details">
                 <img id="background-image" src="https://github.com/geoffmccabe/AIFN1-nft-minting/raw/main/images/Preview_Panel_Bkgd_600px.webp" alt="AI Background Preview">
         <p id="background-metadata">Default background shown.</p>
       </div>`,
      'left'
    );

    const mintingPanel = new Panel('minting-panel', 'Minting',
      `<div id="mint-section">
         <button id="mintButton" disabled>Mint NFT</button>
         <div id="mintFeeDisplay">Mint Fee: Loading...</div>
        <div id="status"></div>        </div>`,
      'right'
    );

    // --- Undo Listener ---
    function setupUndoListener() {
      document.addEventListener('keydown', (e) => {
        const now = Date.now();
        // Simple debounce
        if (now - lastUndoTime < 300) return;

        // Check for Ctrl+Z or Cmd+Z
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
          e.preventDefault();
          lastUndoTime = now; // Update time after action

          if (!currentImage || !document.contains(currentImage)) return; // Ensure current image is valid

          // Find corresponding trait and variant based on currentImage ID
          const traitId = currentImage.id.replace('preview-trait', '');
          const trait = TraitManager.getTrait(traitId);
          if (!trait || trait.variants.length <= trait.selected) return; // Ensure trait/variant valid

          const variationName = trait.variants[trait.selected].name;
          const key = `${trait.id}-${variationName}`; // History key

          if (variantHistories[key] && variantHistories[key].length > 1) {
            console.log(`Undo detected for ${key}`); // Debug Log
            variantHistories[key].pop(); // Remove current position
            const previousPosition = variantHistories[key][variantHistories[key].length - 1]; // Get previous

            // Apply previous position
            currentImage.style.left = `${previousPosition.left}px`;
            currentImage.style.top = `${previousPosition.top}px`;

            // Update localStorage (optional, but keeps it synced)
            try {
              localStorage.setItem(`trait${trait.id}-${variationName}-position`, JSON.stringify(previousPosition));
            } catch (err) { console.error('Failed to save undo position to localStorage:', err); }

            // Update UI elements
            const coordsElement = document.getElementById('coordinates');
            if (coordsElement) updateCoordinates(currentImage, coordsElement);
            // Update samples if needed (might be slow if called frequently)
            // updateSamplePositions(trait.id, trait.variants[trait.selected].id, previousPosition);
          } else {
            console.log(`Undo ignored for ${key}: No history or only one entry.`); // Debug Log
          }
        }
      });
    }

    // --- DOMContentLoaded --- Initial setup ---
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOMContentLoaded: Setting up application."); // Debug Log
      try {
          // Ethers setup (potential point of failure if MetaMask not present/ready)
          if (typeof window.ethereum !== 'undefined') {
                provider = new ethers.providers.Web3Provider(window.ethereum);
                // Use the config object directly (ensure config.js loaded)
                if (window.config && window.config.sepolia && window.config.abi) {
                     contract = new ethers.Contract(config.sepolia.contractAddress, config.abi, provider);
                     signer = provider.getSigner(); // Get signer instance
                     contractWithSigner = contract.connect(signer); // Contract instance connected to signer
                     console.log("Ethers setup complete. Contract Address:", config.sepolia.contractAddress); // Debug Log
                } else {
                    console.error("Blockchain config not found or incomplete in config.js!");
                    // Display error to user?
                }
          } else {
               console.error("MetaMask (or other Ethereum provider) not detected!");
               // Display message to user?
          }

          // Add panels to the manager - renderAll is called internally by addPanel
          console.log("Adding panels..."); // Debug Log
          panelManager.addPanel(logoPanel);
          panelManager.addPanel(traitsPanel);
          panelManager.addPanel(backgroundPanel); // Add in desired initial order
          panelManager.addPanel(previewPanel);
          panelManager.addPanel(previewSamplesPanel);
          panelManager.addPanel(mintingPanel);
          console.log("Finished adding panels."); // Debug Log


          // Initialize Trait Manager (creates default traits)
          TraitManager.initialize();
          // Initial population of Traits Panel requires manual update after initialize
          const traitsPanelInstance = panelManager.panels.find(p=>p.id==='traits-panel');
          if(traitsPanelInstance) traitsPanelInstance.update(getTraitsContent());

          // Initial population of samples panel
          updatePreviewSamples(); // Now also sets up listeners via reAttach

          // Fetch initial mint fee (implement actual fetch later)
          fetchMintFee();


          // Setup global listeners like Undo
          setupUndoListener();


          // Initial selection for traits (if they have variants after initialize - maybe none do?)
          TraitManager.getAllTraits().forEach(trait => {
                if (trait.variants.length > 0) {
                    selectVariation(trait.id, trait.variants[0].id); // Select first variant if exists
                }
          });

          // *** FIX: Remove redundant/incorrect call to non-existent setupDrag ***
          // The drag/resize setup is now handled within renderAll -> setupPanelActions
          // panelManager.panels.forEach(panel => panelManager.setupDrag(panel)); // DELETE THIS LINE

          // Setup for initial trait images if traitImages array is populated (might be empty initially)
          // This might be better handled after first file upload/variation selection
          // traitImages.forEach((img, index) => setupDragAndDrop(img, index)); // DELETE or move this logic


          console.log("Initial setup complete."); // Debug Log

      } catch (error) {
            console.error("Error during initial setup:", error);
            // Display a user-friendly error message on the page?
            const body = document.querySelector('body');
            if(body) body.innerHTML = `<p style="color:red; font-weight:bold; padding:20px;">Error during application initialization. Please check the console (F12) for details. Error: ${error.message}</p>`;
      }
    });




    /* Section 4 - TRAIT MANAGEMENT LOGIC */





    function getTraitsContent() {
      let html = '<div id="trait-container">';
      TraitManager.getAllTraits().forEach(trait => {
        html += `
          <div id="trait${trait.id}" class="trait-section">
            <div class="trait-header">
              <h2>TRAIT ${trait.position}${trait.isUserAssignedName && trait.name ? ` - ${trait.name}` : ''}</h2>
              <div class="trait-controls">
                <span class="up-arrow" data-trait="${trait.id}" data-tooltip="Swap Trait Order">⬆️</span>
                <span class="down-arrow" data-trait="${trait.id}" data-tooltip="Swap Trait Order">⬇️</span>
                <span class="add-trait" data-trait="${trait.id}">➕</span>
                <span class="remove-trait" data-trait="${trait.id}">➖</span>
              </div>
            </div>
            <input type="text" id="trait${trait.id}-name" placeholder="Trait ${trait.position}" ${trait.isUserAssignedName ? `value="${trait.name}"` : ''}>
            <input type="file" id="trait${trait.id}-files" accept="image/png,image/webp" multiple onchange="handleFileChange('${trait.id}', this)">
            <label class="file-input-label" for="trait${trait.id}-files">Choose Files</label>
            <div id="trait${trait.id}-grid" class="trait-grid">`;
        trait.variants.forEach(variant => {
          html += `
            <div class="variation-container" data-trait-id="${trait.id}" data-variation-id="${variant.id}">
              <div class="variation-image-wrapper${trait.selected === trait.variants.indexOf(variant) ? ' selected' : ''}">
                <img src="${variant.url}" alt="${variant.name}" class="variation">
              </div>
              <div class="variation-filename">${variant.name}</div>
            </div>`;
        });
        html += `</div></div>`;
      });
      html += '</div>';
      return html;
    }

    function handleFileChange(traitId, input) {
      console.log(`File input triggered for trait ${traitId}`);
      const files = Array.from(input.files).sort((a, b) => a.name.localeCompare(b.name));
      if (!files.length) {
        console.log('No files selected');
        return;
      }

      const validTypes = ['image/png', 'image/webp'];
      for (let file of files) {
        if (!validTypes.includes(file.type)) {
          console.error(`Invalid file type: ${file.name} (${file.type})`);
          return;
        }
      }

      const trait = TraitManager.getTrait(traitId);
      if (!trait.isUserAssignedName) {
        const position = TraitManager.getAllTraits().findIndex(t => t.id === traitId) + 1;
        trait.name = `Trait ${position}`;
      }

      trait.variants.forEach(variant => {
        if (variant.url && variant.url.startsWith('blob:')) {
          URL.revokeObjectURL(variant.url);
        }
      });

      trait.variants = [];
      traitImages = traitImages.filter(img => img.id !== `preview-trait${traitId}`);
      files.forEach(file => {
        const variationName = file.name.split('.').slice(0, -1).join('.');
        const url = URL.createObjectURL(file);
        TraitManager.addVariant(traitId, { name: variationName, url });
      });

      if (trait.variants.length > 0) {
        console.log(`Selecting variant for trait ${traitId}`);
        setTimeout(() => {
          selectVariation(traitId, trait.variants[0].id);
        }, 100);
        document.querySelector(`label[for="trait${traitId}-files"]`).textContent = 'Choose New Files';
        autoPositioned[TraitManager.getAllTraits().findIndex(t => t.id === traitId)] = false;
      } else {
        console.log('No variants added for trait', traitId);
      }

      traitsPanel.update(getTraitsContent());
      TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
      updateMintButton();
      updatePreviewSamples();
      input.value = ''; // Clear the input to prevent double triggering
    }

    function setupTraitListeners(traitId) {
      const nameInput = document.getElementById(`trait${traitId}-name`);
      const grid = document.getElementById(`trait${traitId}-grid`);
      const upArrow = document.querySelector(`.up-arrow[data-trait="${traitId}"]`);
      const downArrow = document.querySelector(`.down-arrow[data-trait="${traitId}"]`);
      const addTraitBtn = document.querySelector(`.add-trait[data-trait="${traitId}"]`);
      const removeTraitBtn = document.querySelector(`.remove-trait[data-trait="${traitId}"]`);

      if (nameInput) {
        nameInput.addEventListener('input', () => {
          const trait = TraitManager.getTrait(traitId);
          trait.name = nameInput.value.trim();
          trait.isUserAssignedName = true;
          const title = nameInput.parentElement.querySelector('h2');
          title.textContent = `TRAIT ${trait.position}${trait.name ? ` - ${trait.name}` : ''}`;
        });
      }

      if (grid) {
        grid.querySelectorAll('.variation-container').forEach(container => {
          container.addEventListener('click', () => {
            const traitId = container.dataset.traitId;
            const variantId = container.dataset.variationId;
            const allWrappers = grid.querySelectorAll('.variation-image-wrapper');
            allWrappers.forEach(w => w.classList.remove('selected'));
            container.querySelector('.variation-image-wrapper').classList.add('selected');
            selectVariation(traitId, variantId);
          });
        });
      }

      if (upArrow) {
        upArrow.addEventListener('click', () => {
          const trait = TraitManager.getTrait(traitId);
          let newPosition = trait.position === 1 ? TraitManager.getAllTraits().length : trait.position - 1;
          TraitManager.moveTrait(traitId, newPosition);
          traitImages = TraitManager.getAllTraits().map(trait => {
            let img = document.getElementById(`preview-trait${trait.id}`);
            if (!img && trait.variants.length > 0) {
              img = document.createElement('img');
              img.id = `preview-trait${trait.id}`;
              img.src = trait.variants[trait.selected].url;
              img.onerror = () => {
                console.error(`Failed to load image for trait ${trait.id}`);
                img.style.visibility = 'hidden';
              };
              document.getElementById('preview').appendChild(img);
              setupDragAndDrop(img, TraitManager.getAllTraits().findIndex(t => t.id === trait.id));
            }
            return img;
          }).filter(img => img);
          traitsPanel.update(getTraitsContent());
          TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
          traitImages.forEach((img, index) => setupDragAndDrop(img, index));
          updatePreviewSamples();
        });
      }

      if (downArrow) {
        downArrow.addEventListener('click', () => {
          const trait = TraitManager.getTrait(traitId);
          let newPosition = trait.position === TraitManager.getAllTraits().length ? 1 : trait.position + 1;
          TraitManager.moveTrait(traitId, newPosition);
          traitImages = TraitManager.getAllTraits().map(trait => {
            let img = document.getElementById(`preview-trait${trait.id}`);
            if (!img && trait.variants.length > 0) {
              img = document.createElement('img');
              img.id = `preview-trait${trait.id}`;
              img.src = trait.variants[trait.selected].url;
              img.onerror = () => {
                console.error(`Failed to load image for trait ${trait.id}`);
                img.style.visibility = 'hidden';
              };
              document.getElementById('preview').appendChild(img);
              setupDragAndDrop(img, TraitManager.getAllTraits().findIndex(t => t.id === trait.id));
            }
            return img;
          }).filter(img => img);
          traitsPanel.update(getTraitsContent());
          TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
          traitImages.forEach((img, index) => setupDragAndDrop(img, index));
          updatePreviewSamples();
        });
      }

      if (addTraitBtn) {
        addTraitBtn.addEventListener('click', () => {
          if (TraitManager.getAllTraits().length < 20) {
            const trait = TraitManager.getTrait(traitId);
            TraitManager.addTrait(trait.position);
            traitsPanel.update(getTraitsContent());
            TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
            updatePreviewSamples();
          }
        });
      }

      if (removeTraitBtn) {
        removeTraitBtn.addEventListener('click', () => removeTrait(traitId));
      }
    }

    function removeTrait(traitId) {
      if (TraitManager.getAllTraits().length <= 1) return;

      const confirmationDialog = document.createElement('div');
      confirmationDialog.className = 'confirmation-dialog';
      const message = document.createElement('p');
      message.textContent = `Are you sure you want to delete Trait ${TraitManager.getTrait(traitId).position}?`;
      const buttonsDiv = document.createElement('div');
      buttonsDiv.className = 'buttons';
      const yesButton = document.createElement('button');
      yesButton.className = 'yes-button';
      yesButton.textContent = 'Y';
      const noButton = document.createElement('button');
      noButton.className = 'no-button';
      noButton.textContent = 'N';

      const deleteAndRemoveDialog = () => {
        TraitManager.removeTrait(traitId);
        traitImages = traitImages.filter(img => img.id !== `preview-trait${traitId}`);
        traitsPanel.update(getTraitsContent());
        TraitManager.getAllTraits().forEach(t => setupTraitListeners(t.id));
        traitImages.forEach((img, index) => setupDragAndDrop(img, index));
        updatePreviewSamples();
      };

      yesButton.addEventListener('click', () => {
        deleteAndRemoveDialog();
        setTimeout(() => {
          if (confirmationDialog && confirmationDialog.parentNode) {
            confirmationDialog.parentNode.removeChild(confirmationDialog);
          }
        }, 0);
      });

      noButton.addEventListener('click', () => confirmationDialog.remove());

      buttonsDiv.appendChild(yesButton);
      buttonsDiv.appendChild(noButton);
      confirmationDialog.appendChild(message);
      confirmationDialog.appendChild(buttonsDiv);
      document.body.appendChild(confirmationDialog);
    }





/* Section 5 - PREVIEW MANAGEMENT LOGIC */





function selectVariation(traitId, variationId) {
  const trait = TraitManager.getTrait(traitId);
  if (!trait) { console.error(`selectVariation: Trait not found for id ${traitId}`); return; }

  const variationIndex = trait.variants.findIndex(v => v.id === variationId);
  if (variationIndex === -1) { console.error(`selectVariation: Variant not found for id ${variationId} in trait ${traitId}`); return; }

  trait.selected = variationIndex;
  const selectedVariant = trait.variants[variationIndex];

  // Use querySelector for potentially better scoping if needed, but ID should be unique
  const previewContainer = document.getElementById('preview');
  if (!previewContainer) { console.error("selectVariation: Preview container (#preview) not found"); return; }

  let previewImage = document.getElementById(`preview-trait${traitId}`);
  if (!previewImage) {
    previewImage = document.createElement('img');
    previewImage.id = `preview-trait${traitId}`;
    previewContainer.appendChild(previewImage);
    // Add to traitImages array for potential external reference (ensure sync if used)
    if (!traitImages.some(img => img.id === previewImage.id)) {
        traitImages.push(previewImage);
        // Simple sort based on current TraitManager order
        traitImages.sort((a, b) => {
            const traitAIndex = TraitManager.getAllTraits().findIndex(t => `preview-trait${t.id}` === a.id);
            const traitBIndex = TraitManager.getAllTraits().findIndex(t => `preview-trait${t.id}` === b.id);
            return (traitAIndex === -1 ? Infinity : traitAIndex) - (traitBIndex === -1 ? Infinity : traitBIndex);
        });
    }
  }

  previewImage.src = selectedVariant.url;
  previewImage.alt = selectedVariant.name;
  previewImage.style.visibility = 'visible';
  previewImage.onerror = () => {
      console.error(`Failed to load image: ${selectedVariant.url}`);
      previewImage.style.visibility = 'hidden';
  };

  // --- Position Loading ---
  const key = `${traitId}-${selectedVariant.name}`;
  const savedPositionStr = localStorage.getItem(`trait${traitId}-${selectedVariant.name}-position`);
  let position = { left: 0, top: 0 };

  if (savedPositionStr) {
      try {
          position = JSON.parse(savedPositionStr);
          if (typeof position.left !== 'number' || typeof position.top !== 'number') {
              position = { left: 0, top: 0 };
              localStorage.removeItem(`trait${traitId}-${selectedVariant.name}-position`);
          }
      } catch (e) {
          position = { left: 0, top: 0 };
          localStorage.removeItem(`trait${traitId}-${selectedVariant.name}-position`);
      }
  }

  previewImage.style.left = `${position.left}px`;
  previewImage.style.top = `${position.top}px`;

  if (!variantHistories[key]) variantHistories[key] = [];
  if (variantHistories[key].length === 0 || JSON.stringify(variantHistories[key].slice(-1)[0]) !== JSON.stringify(position)) {
      variantHistories[key].push(position);
  }
  // --- End Position Loading ---

  const currentTraitIndex = TraitManager.getAllTraits().findIndex(t => t.id === traitId);
  if (currentTraitIndex !== -1) {
      setupDragAndDrop(previewImage, currentTraitIndex); // Setup image drag
  }

  currentImage = previewImage; // Set global reference
  updateZIndices();
  const coordsElement = document.getElementById('coordinates'); // Find globally ok here? Maybe query context too.
  if (coordsElement) {
      updateCoordinates(currentImage, coordsElement);
  }
}

// *** MODIFIED: Make setupPreviewListeners robust and use context ***
function setupPreviewListeners(panelElementContext) {
  // If no context provided, maybe exit or try global (but context is preferred)
  const context = panelElementContext || document.getElementById('preview-panel');
  if (!context) {
    console.warn("setupPreviewListeners: Preview panel context not found. Skipping listener setup.");
    return;
  }
  // console.log("setupPreviewListeners: Setting up listeners within context:", context.id); // Debug Log

  // --- Use flags to prevent duplicate listeners ---
  const markListenerAttached = (el, type) => el.setAttribute(`data-listener-${type}`, 'true');
  const isListenerAttached = (el, type) => el.hasAttribute(`data-listener-${type}`);


  // Query elements *within* the provided panel context
  const preview = context.querySelector('#preview');
  const coordinates = context.querySelector('#coordinates');
  const directionEmojis = context.querySelectorAll('.direction-emoji');
  const magnifyEmoji = context.querySelector('.magnify-emoji');
  // enlargedPreview is likely outside the panel, keep global search but check null
  const enlargedPreview = document.getElementById('enlarged-preview');

  // --- Add Listeners with Null Checks ---
  if (preview && !isListenerAttached(preview, 'preview-move')) {
    // console.log("setupPreviewListeners: Attaching listeners to #preview"); // Debug Log
    // Use named functions for handlers to allow potential removal if needed (though flags prevent duplicates now)
    const handlePreviewMouseMove = (e) => {
        if (!isDragging || !currentImage || currentImage.parentElement !== preview) return;
        const rect = preview.getBoundingClientRect();
        let newLeft = e.clientX - rect.left - offsetX;
        let newTop = e.clientY - rect.top - offsetY;
        const previewWidth = preview.clientWidth;
        const previewHeight = preview.clientHeight;
        const imgWidth = currentImage.clientWidth;
        const imgHeight = currentImage.clientHeight;
        newLeft = Math.max(0, Math.min(newLeft, previewWidth - imgWidth));
        newTop = Math.max(0, Math.min(newTop, previewHeight - imgHeight));
        currentImage.style.left = `${newLeft}px`;
        currentImage.style.top = `${newTop}px`;
        // Ensure coordinates element exists before updating
        const currentCoords = context.querySelector('#coordinates');
        if (currentCoords) updateCoordinates(currentImage, currentCoords);
    };

    const handlePreviewMouseUpOrLeave = () => {
        if (isDragging && currentImage && currentImage.parentElement === preview) {
            const traitIndex = traitImages.findIndex(img => img === currentImage);
             if (traitIndex !== -1) {
                 const trait = TraitManager.getAllTraits()[traitIndex];
                 if (trait && trait.variants.length > trait.selected) {
                     const variationName = trait.variants[trait.selected].name;
                     savePosition(currentImage, trait.id, variationName);
                 }
             }
            // Let the global mouseup handler in setupPanelActions handle isDragging=false
        }
    };

    preview.addEventListener('mousemove', handlePreviewMouseMove);
    preview.addEventListener('mouseup', handlePreviewMouseUpOrLeave);
    preview.addEventListener('mouseleave', handlePreviewMouseUpOrLeave);
    markListenerAttached(preview, 'preview-move');

  } else if (!preview) {
      console.warn("setupPreviewListeners: #preview element not found within context.");
  }

  // --- Arrow Controls ---
  if (directionEmojis.length > 0) {
    // console.log("setupPreviewListeners: Attaching listeners to direction emojis"); // Debug Log
    directionEmojis.forEach(emoji => {
        const direction = emoji.getAttribute('data-direction');
        if (!isListenerAttached(emoji, 'arrow-move')) { // Check flag before adding
             const arrowMouseDownHandler = () => {
                if (!currentImage || !currentImage.src || !document.contains(currentImage)) return;
                const currentCoordsElement = context.querySelector('#coordinates'); // Use context
                if (!currentCoordsElement) return;

                stopArrowMovement();
                moveInterval = setInterval(() => {
                    if (!currentImage || !document.contains(currentImage)) { stopArrowMovement(); return; }
                    let left = parseFloat(currentImage.style.left) || 0;
                    let top = parseFloat(currentImage.style.top) || 0;
                    if (direction === 'up') top -= 1; if (direction === 'down') top += 1;
                    if (direction === 'left') left -= 1; if (direction === 'right') right += 1;

                    const previewContainer = context.querySelector('#preview'); // Use context
                    if(previewContainer){
                        const previewWidth = previewContainer.clientWidth; const previewHeight = previewContainer.clientHeight;
                        const imgWidth = currentImage.clientWidth; const imgHeight = currentImage.clientHeight;
                        left = Math.max(0, Math.min(left, previewWidth - imgWidth));
                        top = Math.max(0, Math.min(top, previewHeight - imgHeight));
                    }
                    currentImage.style.left = `${left}px`; currentImage.style.top = `${top}px`;
                    if (!currentImage.classList.contains('dragging')) currentImage.classList.add('dragging');
                    updateCoordinates(currentImage, currentCoordsElement);
                }, 50);
             };
             const arrowMouseUpOrLeaveHandler = () => { stopArrowMovement(); };

             emoji.addEventListener('mousedown', arrowMouseDownHandler);
             emoji.addEventListener('mouseup', arrowMouseUpOrLeaveHandler);
             emoji.addEventListener('mouseleave', arrowMouseUpOrLeaveHandler);
              markListenerAttached(emoji, 'arrow-move'); // Mark as attached
        }
    });
  } else {
      console.warn("setupPreviewListeners: Direction emojis not found within context.");
  }


  // --- Magnify Control ---
  if (magnifyEmoji && !isListenerAttached(magnifyEmoji, 'magnify-click')) { // Check flag
     // console.log("setupPreviewListeners: Attaching listener to magnify emoji"); // Debug Log
     const magnifyClickHandler = () => {
            const currentPreviewContainer = context.querySelector('#preview'); // Use context
            // Use global ID for enlargedPreview, but check if it exists
         const currentEnlargedPreview = document.getElementById('enlarged-preview');
            if (!currentPreviewContainer || !currentEnlargedPreview) {
            console.error("Magnify Error: Preview or Enlarged container not found."); return;
         }

            const visibleTraitImages = TraitManager.getAllTraits()
                .map(trait => document.getElementById(`preview-trait${trait.id}`))
                .filter(img => img && img.style.visibility !== 'hidden' && img.src);

            if(visibleTraitImages.length === 0) return;

            const maxWidth = window.innerWidth * 0.9; const maxHeight = window.innerHeight * 0.9;
            const previewRect = currentPreviewContainer.getBoundingClientRect();
            const baseWidth = previewRect.width; const baseHeight = previewRect.height;

            let scale = maxWidth / baseWidth;
            if (maxHeight / baseHeight < scale) scale = maxHeight / baseHeight;

            currentEnlargedPreview.innerHTML = ''; // Clear
            currentEnlargedPreview.style.width = `${baseWidth * scale}px`;
            currentEnlargedPreview.style.height = `${baseHeight * scale}px`;

            const sortedImages = visibleTraitImages
                 .map(img => ({ img, z: parseInt(img.style.zIndex || '0', 10) }))
                 .sort((a, b) => a.z - b.z);

            sortedImages.forEach(({ img }) => {
                const clone = img.cloneNode(true);
                const imgStyle = window.getComputedStyle(img);
                const originalWidth = parseFloat(imgStyle.width); const originalHeight = parseFloat(imgStyle.height);
                const originalLeft = parseFloat(img.style.left) || 0; const originalTop = parseFloat(img.style.top) || 0;

                clone.style.width = `${originalWidth * scale}px`; clone.style.height = `${originalHeight * scale}px`;
                clone.style.left = `${originalLeft * scale}px`; clone.style.top = `${originalTop * scale}px`;
                clone.style.position = 'absolute'; clone.style.zIndex = img.style.zIndex;
                clone.style.visibility = 'visible';
                currentEnlargedPreview.appendChild(clone);
             });

            currentEnlargedPreview.style.display = 'block';
         // Use a named handler for easy removal
         const closeEnlargedHandler = () => {
             currentEnlargedPreview.style.display = 'none';
             currentEnlargedPreview.removeEventListener('click', closeEnlargedHandler);
         };
         // Remove existing listener before adding new one
         currentEnlargedPreview.removeEventListener('click', closeEnlargedHandler);
         currentEnlargedPreview.addEventListener('click', closeEnlargedHandler);
     };
     magnifyEmoji.addEventListener('click', magnifyClickHandler);
      markListenerAttached(magnifyEmoji, 'magnify-click'); // Mark as attached
  } else if (!magnifyEmoji) {
      console.warn("setupPreviewListeners: Magnify emoji not found within context.");
  }
}


function setupDragAndDrop(img, traitIndex) {
  if (!img || !img.parentElement || img.parentElement.id !== 'preview') {
      return; // Only setup for images in main preview
  }
  img.addEventListener('dragstart', e => e.preventDefault());

  // Use flag to prevent duplicate listeners on the img element
  const listenerFlag = 'data-dragdrop-listener';
  if (img.hasAttribute(listenerFlag)) return;

  const handleImageMouseDown = (e) => {
    if (!img.src || !document.contains(img)) return;
    e.stopPropagation(); // Prevent panel drag/resize

    isDragging = true; // Global flag for preview image drag
    currentImage = img;

    const rect = img.getBoundingClientRect();
    offsetX = e.clientX - rect.left; // Offset relative to image top-left
    offsetY = e.clientY - rect.top;

    img.style.cursor = 'grabbing';
    img.classList.add('dragging');
    // Temporarily boost z-index while dragging THIS image
    const originalZIndex = img.style.zIndex; // Store original z-index
    img.style.zIndex = '999';
    // Store original z-index on the element for restoration on mouseup
    img.setAttribute('data-original-zindex', originalZIndex);

    // Update coordinates display if available globally or within context
    const coordsElement = document.getElementById('coordinates'); // Assume global for now
    if (coordsElement) updateCoordinates(img, coordsElement);

    // Global mouseup listener (from setupPanelActions) should handle isDragging = false
    // Add a one-time listener specifically to restore z-index for this image drag
    const restoreZIndexOnMouseUp = () => {
        if (img && img.hasAttribute('data-original-zindex')) {
            img.style.zIndex = img.getAttribute('data-original-zindex');
            img.removeAttribute('data-original-zindex');
        }
        // Also remove dragging class and reset cursor here for safety
        if (img) {
            img.classList.remove('dragging');
            img.style.cursor = 'grab'; // Or default inherit
        }
        document.removeEventListener('mouseup', restoreZIndexOnMouseUp, { once: true });
    };
    document.addEventListener('mouseup', restoreZIndexOnMouseUp, { once: true });

  };

  img.addEventListener('mousedown', handleImageMouseDown);
  img.setAttribute(listenerFlag, 'true'); // Mark listener as attached

}

function stopArrowMovement() {
  if (moveInterval) {
    clearInterval(moveInterval);
    moveInterval = null;
    if (currentImage && document.contains(currentImage)) {
        currentImage.classList.remove('dragging');
      const traitIndex = traitImages.findIndex(img => img === currentImage);
       if(traitIndex !== -1){
            const trait = TraitManager.getAllTraits()[traitIndex];
            if (trait && trait.variants.length > trait.selected) {
                const variationName = trait.variants[trait.selected].name;
                savePosition(currentImage, trait.id, variationName);
            }
       }
    }
  }
}

function updateCoordinates(img, coordsElement) {
  if (img && coordsElement && document.contains(img)) {
    const left = parseFloat(img.style.left) || 0;
    const top = parseFloat(img.style.top) || 0;
    coordsElement.innerHTML = `<strong>Coordinates:</strong> (${Math.round(left)}, ${Math.round(top)})`;
  }
}

function updateZIndices() {
    const traits = TraitManager.getAllTraits();
    traits.forEach((trait) => {
        const img = document.getElementById(`preview-trait${trait.id}`);
        if (img && !img.hasAttribute('data-original-zindex')) { // Don't override if being dragged
            // Trait position 1 = highest layer = highest z-index
            // Z-index relative to other traits
            img.style.zIndex = String(traits.length - trait.position + 1); // +1 to start z-index > 0
        }
    });
}



    /* Section 6 - PREVIEW SAMPLES LOGIC */





    function getPreviewSamplesContent() {
      let html = `<div id="preview-samples"><div id="preview-samples-header"><button id="update-previews">UPDATE</button></div><div id="preview-samples-grid">`;
      sampleData.forEach((sample, i) => {
        html += `<div class="sample-container">`;
        sample.forEach(item => {
          const trait = TraitManager.getTrait(item.traitId);
          const variant = trait.variants.find(v => v.id === item.variantId);
          const scale = 140 / 600;
          html += `<img src="${variant.url}" alt="Sample ${i + 1} - Trait ${trait.position}" style="position: absolute; z-index: ${TraitManager.getAllTraits().length - trait.position + 1}; left: ${item.position.left * scale}px; top: ${item.position.top * scale}px; transform: scale(0.23333); transform-origin: top left;">`;
        });
        html += `</div>`;
      });
      html += `</div></div>`;
      return html;
    }

    function updatePreviewSamples() {
      sampleData = Array(16).fill(null).map(() => []);
      const traits = TraitManager.getAllTraits().slice().sort((a, b) => a.position - b.position);
      for (let i = 0; i < 16; i++) {
        traits.forEach(trait => {
          if (trait.variants.length === 0) return;
          const randomIndex = Math.floor(Math.random() * trait.variants.length);
          const variant = trait.variants[randomIndex];
          const key = `${trait.id}-${variant.name}`;
          const savedPosition = localStorage.getItem(`trait${trait.id}-${variant.name}-position`) || JSON.stringify({ left: 0, top: 0 });
          const position = JSON.parse(savedPosition);
          if (!variantHistories[key]) variantHistories[key] = [position];
          sampleData[i].push({ traitId: trait.id, variantId: variant.id, position });
        });
      }
      previewSamplesPanel.update(getPreviewSamplesContent());
      const updateButton = document.getElementById('update-previews');
      if (updateButton) {
        updateButton.addEventListener('click', updatePreviewSamples);
      }
      document.querySelectorAll('#preview-samples-grid .sample-container').forEach((container, i) => {
        container.addEventListener('click', () => {
          sampleData[i].forEach(sample => selectVariation(sample.traitId, sample.variantId));
        });
      });
    }





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

    function savePosition(img, traitId, variationName) {
      const position = { left: parseFloat(img.style.left) || 0, top: parseFloat(img.style.top) || 0 };
      const key = `${traitId}-${variationName}`;
      if (!variantHistories[key]) variantHistories[key] = [];
      variantHistories[key].push(position);
      try {
        localStorage.setItem(`trait${traitId}-${variationName}-position`, JSON.stringify(position));
        localStorage.setItem(`trait${traitId}-${variationName}-manuallyMoved`, 'true');
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }

      const trait = TraitManager.getTrait(traitId);
      const traitIndex = TraitManager.getAllTraits().findIndex(t => t.id === traitId);
      const currentVariationIndex = trait.variants.findIndex(v => v.name === variationName);
      if (currentVariationIndex === 0 && !autoPositioned[traitIndex]) {
        for (let i = 1; i < trait.variants.length; i++) {
          const otherVariationName = trait.variants[i].name;
          const otherKey = `${traitId}-${otherVariationName}`;
          variantHistories[otherKey] = [{ left: position.left, top: position.top }];
          try {
            localStorage.setItem(`trait${traitId}-${otherVariationName}-position`, JSON.stringify(position));
            localStorage.removeItem(`trait${traitId}-${otherVariationName}-manuallyMoved`);
          } catch (e) {
            console.error('Failed to save to localStorage:', e);
          }
          if (trait.selected === i) {
            const previewImage = document.getElementById(`preview-trait${traitId}`);
            if (previewImage && previewImage.src) {
              previewImage.style.left = `${position.left}px`;
              previewImage.style.top = `${position.top}px`;
            }
          }
        }
        autoPositioned[traitIndex] = true;
      }

      updateSamplePositions(traitId, variationName, position);
      updateSubsequentTraits(traitId, variationName, position);
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
                previewImage.style.left = `${position.left}px`;
                previewImage.style.top = `${position.top}px`;
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
                previewImage.style.left = `${position.left}px`;
                previewImage.style.top = `${position.top}px`;
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

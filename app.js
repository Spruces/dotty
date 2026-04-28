const svg = document.getElementById('gridSvg');
const gridSizeInput = document.getElementById('gridSize');
const dotSizeInput = document.getElementById('dotSize');
const paletteEl = document.getElementById('palette');
const addColorBtn = document.getElementById('addColor');
const imgUpload = document.getElementById('imgUpload');
const uploadBtn = document.getElementById('uploadBtn');
const eyedropBtn = document.getElementById('eyedropBtn');
const imgPreviewWrap = document.getElementById('imgPreviewWrap');
const sourceImage = document.getElementById('sourceImage');
const brightnessInput = document.getElementById('brightness');
const fillInput = document.getElementById('fillFactor');
const clearBtn = document.getElementById('clearBtn');
const exportSvgBtn = document.getElementById('exportSvg');
const exportPngBtn = document.getElementById('exportPng');
const inspectorEl = document.getElementById('inspector');
const selColorPreview = document.getElementById('selColorPreview');
const dotBrightnessInput = document.getElementById('dotBrightness');
const dotFillInput = document.getElementById('dotFill');
const applyDotBtn = document.getElementById('applyDot');
const resetDotBtn = document.getElementById('resetDot');
const deleteDotBtn = document.getElementById('deleteDot');
const quad0Btn = document.getElementById('q0');
const quad1Btn = document.getElementById('q1');
const quad2Btn = document.getElementById('q2');
const quad3Btn = document.getElementById('q3');
const paletteTrash = document.getElementById('paletteTrash');
const addHexInput = document.getElementById('addHex');
const exportPaletteBtn = document.getElementById('exportPalette');
const importPaletteInput = document.getElementById('importPalette');
const importPaletteBtn = document.getElementById('importPaletteBtn');
const dotShapeSelect = document.getElementById('dotShape');
const exportSizeInput = document.getElementById('exportSize');
const diagSplitCheckbox = document.getElementById('diagSplit');
const draftNameInput = document.getElementById('draftName');
const saveDraftBtn = document.getElementById('saveDraftBtn');
const loadDraftBtn = document.getElementById('loadDraftBtn');
const deleteDraftBtn = document.getElementById('deleteDraftBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const draftList = document.getElementById('draftList');
const draftStatus = document.getElementById('draftStatus');
const dotSizeVal = document.getElementById('dotSizeVal');
const fillFactorVal = document.getElementById('fillFactorVal');
const brightnessVal = document.getElementById('brightnessVal');
const dotBrightnessVal = document.getElementById('dotBrightnessVal');
const dotFillVal = document.getElementById('dotFillVal');

let gridSize = parseInt(gridSizeInput.value,10);
let dotSize = parseInt(dotSizeInput.value,10);
let brightness = parseInt(brightnessInput.value,10)/100;
let palette = ['#ff6b6b','#ffd93d','#6be3b4','#7aa2ff','#c399ff'];
let selectedColor = palette[0];
// cells: null or { color: '#rrggbb', brightness: number|null, fill: number|null }
let cells = [];
let eyedropMode = false;
let currentSelectedIdx = null;
let fillFactor = parseInt(fillInput?.value||75,10)/100;
let dotShape = dotShapeSelect ? dotShapeSelect.value : 'circle';
let historyStack = [];
let maxHistory = 60;

function cloneCells(cellsArray){
  return cellsArray.map(cell => {
    if(!cell) return null;
    return {
      color: cell.color,
      brightness: cell.brightness,
      fill: cell.fill,
      quads: cell.quads ? cell.quads.slice() : null,
    };
  });
}

function pushHistory(){
  historyStack.push(cloneCells(cells));
  if(historyStack.length > maxHistory) historyStack.shift();
}

function undo(){
  if(historyStack.length === 0) return;
  cells = historyStack.pop();
  renderSvg();
  updateDraftStatus('Undo');
}

function init(){
  setupPalette();
  resetGrid();
  attachEvents();
  renderDraftList();
  updateDraftStatus(getDraftCount() ? `${getDraftCount()} drafts saved` : 'No drafts saved');
}

  function attachPaletteDragEvents(){
    if(paletteEl.dataset.dragAttached) return;
    paletteEl.addEventListener('dragover', (e)=>{ e.preventDefault(); });
    paletteEl.addEventListener('drop', (e)=>{
      e.preventDefault();
      const src = e.dataTransfer.getData('text/plain');
      const srcIdx = parseInt(src,10);
      const tgtBtn = e.target.closest('button');
      const tgtIdx = tgtBtn ? parseInt(tgtBtn.dataset.index,10) : palette.length-1;
      if(Number.isFinite(srcIdx) && Number.isFinite(tgtIdx) && srcIdx!==tgtIdx){
        const item = palette.splice(srcIdx,1)[0];
        palette.splice(tgtIdx,0,item);
        setupPalette();
      }
    });
    paletteEl.dataset.dragAttached = '1';
  }

  function applyBrightness(hex, factor){
    const {h,s,l} = hexToHsl(hex);
    const nl = Math.max(0, Math.min(100, l * factor));
    return hslToHex(h,s,nl);
  }

  function hexToHsl(hex){
    const c = hex.replace('#','');
    const r = parseInt(c.substring(0,2),16)/255;
    const g = parseInt(c.substring(2,4),16)/255;
    const b = parseInt(c.substring(4,6),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h=0,s=0,l=(max+min)/2;
    if(max!==min){
      const d = max-min;
      s = l>0.5? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h = (g-b)/d + (g<b?6:0); break;
        case g: h = (b-r)/d + 2; break;
        case b: h = (r-g)/d + 4; break;
      }
      h = h*60;
    }
    return {h: Math.round(h), s: Math.round(s*100), l: Math.round(l*100)};
  }

  function hslToHex(h,s,l){
    s/=100; l/=100;
    const k = n => (n+ h/30)%12;
    const a = s * Math.min(l,1-l);
    const f = n => l - a * Math.max(-1, Math.min(k(n)-3, Math.min(9-k(n),1)));
    const r = Math.round(255*f(0));
    const g = Math.round(255*f(8));
    const b = Math.round(255*f(4));
    return `#${((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1)}`;
  }
  function resetGrid(){
    gridSize = parseInt(gridSizeInput.value,10) || 32;
    cells = new Array(gridSize*gridSize).fill(null);
    renderSvg();
  }

  function updateDraftStatus(message){
    if(draftStatus) draftStatus.textContent = message;
  }

  function getSvgPointerLocation(e){
    const rect = svg.getBoundingClientRect();
    const size = 800;
    const px = (e.clientX - rect.left) * (size / rect.width);
    const py = (e.clientY - rect.top) * (size / rect.height);
    const cell = size / gridSize;
    return {
      x: Math.floor(px / cell),
      y: Math.floor(py / cell),
      px,
      py,
      cell,
    };
  }

  function getDrafts(){
    const raw = localStorage.getItem('dottyDrafts');
    try{
      return raw ? JSON.parse(raw) : {};
    }catch(err){
      return {};
    }
  }

  function setDrafts(drafts){
    localStorage.setItem('dottyDrafts', JSON.stringify(drafts));
    renderDraftList();
    updateDraftStatus(getDraftCount() ? `${getDraftCount()} drafts saved` : 'No drafts saved');
  }

  function getDraftCount(){
    return Object.keys(getDrafts()).length;
  }

  function renderDraftList(){
    if(!draftList) return;
    const drafts = getDrafts();
    draftList.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = drafts && Object.keys(drafts).length ? 'Select a draft...' : 'No saved drafts';
    placeholder.disabled = true;
    placeholder.selected = true;
    draftList.appendChild(placeholder);
    for(const name of Object.keys(drafts).sort()){
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      draftList.appendChild(option);
    }
  }

  function saveDraft(){
    const name = (draftNameInput?.value || '').trim();
    if(!name){
      alert('Draft name is required.');
      return;
    }
    const drafts = getDrafts();
    drafts[name] = {
      gridSize: parseInt(gridSizeInput.value,10) || 32,
      dotSize: parseInt(dotSizeInput.value,10) || 16,
      brightness: parseInt(brightnessInput.value,10) || 100,
      fillFactor: parseInt(fillInput.value,10) || 75,
      dotShape: dotShapeSelect ? dotShapeSelect.value : dotShape,
      diagSplit: diagSplitCheckbox ? diagSplitCheckbox.checked : false,
      palette: palette.slice(),
      selectedColor,
      cells,
    };
    setDrafts(drafts);
    if(draftList) draftList.value = name;
    updateDraftStatus(`Draft '${name}' saved`);
  }

  function loadDraft(){
    const name = draftList?.value;
    if(!name){
      alert('Please select a draft to load.');
      return;
    }
    const drafts = getDrafts();
    const draft = drafts[name];
    if(!draft){
      alert('Selected draft not found.');
      return;
    }
    try{
      gridSizeInput.value = draft.gridSize || 32;
      dotSizeInput.value = draft.dotSize || dotSizeInput.value;
      brightnessInput.value = draft.brightness != null ? draft.brightness : brightnessInput.value;
      fillInput.value = draft.fillFactor != null ? draft.fillFactor : fillInput.value;
      if(dotShapeSelect) dotShapeSelect.value = draft.dotShape || dotShapeSelect.value;
      if(diagSplitCheckbox) diagSplitCheckbox.checked = draft.diagSplit || false;
      palette = Array.isArray(draft.palette) ? draft.palette.map(c=>c.startsWith('#')?c:'#'+c.replace('#','')) : palette;
      selectedColor = draft.selectedColor || palette[0] || selectedColor;
      gridSize = parseInt(gridSizeInput.value,10) || 32;
      dotSize = parseInt(dotSizeInput.value,10) || dotSize;
      brightness = parseInt(brightnessInput.value,10)/100;
      fillFactor = parseInt(fillInput.value,10)/100;
      dotShape = dotShapeSelect ? dotShapeSelect.value : dotShape;
      cells = Array.isArray(draft.cells) ? draft.cells : new Array(gridSize*gridSize).fill(null);
      if(dotSizeVal) dotSizeVal.textContent = dotSizeInput.value;
      if(fillFactorVal) fillFactorVal.textContent = fillInput.value;
      if(brightnessVal) brightnessVal.textContent = brightnessInput.value;
      setupPalette();
      renderSvg();
      updateDraftStatus(`Draft '${name}' loaded`);
    }catch(err){
      console.error(err);
      alert('시안 불러오기 중 오류가 발생했습니다.');
    }
  }

  function deleteDraft(){
    const name = draftList?.value;
    if(!name){
      alert('Please select a draft to delete.');
      return;
    }
    const drafts = getDrafts();
    if(!drafts[name]){
      alert('Selected draft not found.');
      return;
    }
    if(!confirm(`Delete draft '${name}'?`)) return;
    delete drafts[name];
    setDrafts(drafts);
    updateDraftStatus(`Draft '${name}' deleted`);
  }

  let isPointerDown = false;
  let dragMode = null;
  let dragStartCell = null;

  function fillRectCells(start, end, color){
    const x0 = Math.min(start.x, end.x);
    const x1 = Math.max(start.x, end.x);
    const y0 = Math.min(start.y, end.y);
    const y1 = Math.max(start.y, end.y);
    for(let yy=y0; yy<=y1; yy++){
      for(let xx=x0; xx<=x1; xx++){
        if(xx<0||yy<0||xx>=gridSize||yy>=gridSize) continue;
        const idx = yy*gridSize + xx;
        cells[idx] = { color, brightness: null, fill: null };
      }
    }
  }

  function paintGridCell(e){
    const {x,y} = getSvgPointerLocation(e);
    if(x<0||y<0||x>=gridSize||y>=gridSize) return;
    const idx = y*gridSize + x;
    if(e.altKey){ openInspectorFor(idx); return; }
    if(e.button === 2){
      cells[idx] = null;
      renderSvg();
      return;
    }
    cells[idx] = { color: selectedColor, brightness: null, fill: null };
    renderSvg();
  }

  function removeRectCells(start, end){
    const x0 = Math.min(start.x, end.x);
    const x1 = Math.max(start.x, end.x);
    const y0 = Math.min(start.y, end.y);
    const y1 = Math.max(start.y, end.y);
    for(let yy=y0; yy<=y1; yy++){
      for(let xx=x0; xx<=x1; xx++){
        if(xx<0||yy<0||xx>=gridSize||yy>=gridSize) continue;
        cells[yy*gridSize + xx] = null;
      }
    }
    renderSvg();
  }

  function loadSampleArt(){
    gridSize = 128;
    gridSizeInput.value = '128';
    dotSize = 8;
    dotSizeInput.value = '8';
    fillFactor = 0.9;
    fillInput.value = '90';
    brightness = 1;
    brightnessInput.value = '100';
    dotShape = 'square';
    if(dotShapeSelect) dotShapeSelect.value = 'square';
    palette = ['#020816','#0f63d8','#69a8ff','#ffffff','#6eb1ff'];
    selectedColor = '#ffffff';
    if(dotSizeVal) dotSizeVal.textContent = dotSizeInput.value;
    if(fillFactorVal) fillFactorVal.textContent = fillInput.value;
    if(brightnessVal) brightnessVal.textContent = brightnessInput.value;
    cells = new Array(gridSize*gridSize).fill(null);
    const setCell = (x,y,color)=>{
      if(x<0||y<0||x>=gridSize||y>=gridSize) return;
      cells[y*gridSize + x] = { color, brightness: null, fill: null };
    };
    const fillRect = (x,y,w,h,color)=>{
      for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++) setCell(xx,yy,color);
    };
    const bg = '#020816';
    const bubble = '#0f63d8';
    const bubbleLight = '#69a8ff';
    const white = '#ffffff';
    const textBlue = '#6eb1ff';
    fillRect(0,0,128,128,bg);
    fillRect(12,10,104,64,bubble);
    fillRect(14,12,100,60,bubbleLight);
    fillRect(14,12,100,44,bubble);
    fillRect(14,52,40,14,bubble);
    fillRect(48,68,12,12,bubble);
    fillRect(62,80,20,10,bubble);
    fillRect(24,74,18,22,bubble);
    fillRect(8,74,20,20,bubble);
    fillRect(90,68,12,20,bubble);
    fillRect(20,76,20,12,bubbleLight);
    fillRect(88,76,12,12,bubbleLight);
    fillRect(42,72,16,10,bubbleLight);
    // speech bubble tail
    fillRect(42,74,12,18,bubble);
    fillRect(34,84,10,10,bubble);
    // braces
    fillRect(26,26,4,2,white);
    fillRect(26,30,4,2,white);
    fillRect(26,34,4,2,white);
    fillRect(26,22,2,8,white);
    fillRect(28,22,2,2,bg);
    fillRect(28,30,2,2,bg);
    fillRect(28,38,2,2,bg);
    fillRect(32,22,2,2,white);
    fillRect(32,30,2,2,white);
    fillRect(32,38,2,2,white);
    fillRect(36,22,2,8,white);
    fillRect(90,22,4,2,white);
    fillRect(90,26,4,2,white);
    fillRect(90,30,4,2,white);
    fillRect(94,22,2,8,white);
    fillRect(92,22,2,2,bg);
    fillRect(92,30,2,2,bg);
    fillRect(92,38,2,2,bg);
    fillRect(86,22,2,2,white);
    fillRect(86,30,2,2,white);
    fillRect(86,38,2,2,white);
    fillRect(82,22,2,8,white);
    // slash
    for(let i=0;i<8;i++) setCell(58+i,18+i,white);
    // text blocks
    fillRect(30,46,68,10,white);
    fillRect(36,60,56,8,textBlue);
    fillRect(28,72,72,6,textBlue);
    // labels
    fillRect(16,86,96,4,textBlue);
    fillRect(16,92,80,3,white);
    setDrafts(getDrafts());
    setupPalette();
    renderSvg();
    updateDraftStatus('Sample loaded');
  }

  function renderSvg(){
    const size = 800;
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    const cell = size / gridSize;
    const bg = document.createElementNS(svg.namespaceURI, 'rect');
    bg.setAttribute('x', 0);
    bg.setAttribute('y', 0);
    bg.setAttribute('width', size);
    bg.setAttribute('height', size);
    bg.setAttribute('fill', '#fcfcfc');
    svg.appendChild(bg);
    const gridStroke = document.createElementNS(svg.namespaceURI, 'g');
    gridStroke.setAttribute('stroke', 'rgba(0,0,0,0.06)');
    gridStroke.setAttribute('stroke-width', '0.5');
    for(let i=0;i<=gridSize;i++){
      const x = i * cell;
      const vline = document.createElementNS(svg.namespaceURI, 'line');
      vline.setAttribute('x1', x);
      vline.setAttribute('y1', 0);
      vline.setAttribute('x2', x);
      vline.setAttribute('y2', size);
      gridStroke.appendChild(vline);
      const y = i * cell;
      const hline = document.createElementNS(svg.namespaceURI, 'line');
      hline.setAttribute('x1', 0);
      hline.setAttribute('y1', y);
      hline.setAttribute('x2', size);
      hline.setAttribute('y2', y);
      gridStroke.appendChild(hline);
    }
    svg.appendChild(gridStroke);
    for(let y=0;y<gridSize;y++){
      for(let x=0;x<gridSize;x++){
        const idx = y*gridSize + x;
        const cx = x*cell + cell/2;
        const cy = y*cell + cell/2;
        const cellObj = cells[idx];
        // if diagonal split mode and cell has quads, draw four small quadrant swatches
        if(diagSplitCheckbox && diagSplitCheckbox.checked){
          const x0 = x*cell;
          const y0 = y*cell;
          const cx0 = x0 + cell/2;
          const cy0 = y0 + cell/2;
          if(cellObj && cellObj.quads){
            const quads = cellObj.quads;
            const quadPoints = [
              [`M ${x0} ${y0} L ${cx0} ${y0} L ${x0} ${cy0} Z`, quads[0]],
              [`M ${x0+cell} ${y0} L ${x0+cell} ${cy0} L ${cx0} ${y0} Z`, quads[1]],
              [`M ${x0} ${y0+cell} L ${cx0} ${y0+cell} L ${x0} ${cy0} Z`, quads[2]],
              [`M ${x0+cell} ${y0+cell} L ${x0+cell} ${cy0} L ${cx0} ${y0+cell} Z`, quads[3]],
            ];
            for(const [pathData, col] of quadPoints){
              if(!col) continue;
              const color = applyBrightness(col, (cellObj.brightness!=null)?cellObj.brightness:brightness);
              const path = document.createElementNS(svg.namespaceURI, 'path');
              path.setAttribute('d', pathData);
              path.setAttribute('fill', color);
              path.setAttribute('stroke', 'rgba(0,0,0,0.08)');
              path.setAttribute('stroke-width', '0.5');
              svg.appendChild(path);
            }
          } else if(cellObj && cellObj.color){
            const color = applyBrightness(cellObj.color, (cellObj.brightness!=null)?cellObj.brightness:brightness);
            const quadPoints = [
              `M ${x0} ${y0} L ${cx0} ${y0} L ${x0} ${cy0} Z`,
              `M ${x0+cell} ${y0} L ${x0+cell} ${cy0} L ${cx0} ${y0} Z`,
              `M ${x0} ${y0+cell} L ${cx0} ${y0+cell} L ${x0} ${cy0} Z`,
              `M ${x0+cell} ${y0+cell} L ${x0+cell} ${cy0} L ${cx0} ${y0+cell} Z`,
            ];
            for(const pathData of quadPoints){
              const path = document.createElementNS(svg.namespaceURI, 'path');
              path.setAttribute('d', pathData);
              path.setAttribute('fill', color);
              path.setAttribute('stroke', 'rgba(0,0,0,0.08)');
              path.setAttribute('stroke-width', '0.5');
              svg.appendChild(path);
            }
          }
          const line1 = document.createElementNS(svg.namespaceURI,'line');
          line1.setAttribute('x1', x*cell); line1.setAttribute('y1', y*cell);
          line1.setAttribute('x2', x*cell+cell); line1.setAttribute('y2', y*cell+cell);
          line1.setAttribute('stroke', 'rgba(0,0,0,0.08)'); line1.setAttribute('stroke-width', '0.5');
          svg.appendChild(line1);
          const line2 = document.createElementNS(svg.namespaceURI,'line');
          line2.setAttribute('x1', x*cell+cell); line2.setAttribute('y1', y*cell);
          line2.setAttribute('x2', x*cell); line2.setAttribute('y2', y*cell+cell);
          line2.setAttribute('stroke', 'rgba(0,0,0,0.08)'); line2.setAttribute('stroke-width', '0.5');
          svg.appendChild(line2);
          continue;
        }

        // normal single-color dot
        if(cellObj && cellObj.color){
          const usedFill = (cellObj && cellObj.fill!=null) ? cellObj.fill : fillFactor;
          const r = (cell/2) * usedFill;
          const color = applyBrightness(cellObj.color, (cellObj.brightness!=null)?cellObj.brightness:brightness);
          if(dotShape === 'circle'){
            const main = document.createElementNS(svg.namespaceURI,'circle');
            main.setAttribute('cx',cx); main.setAttribute('cy',cy); main.setAttribute('r',r);
            main.setAttribute('fill', color); main.setAttribute('class','dot-stroke'); svg.appendChild(main);
            const hl = document.createElementNS(svg.namespaceURI,'circle');
            hl.setAttribute('cx',cx - r*0.25); hl.setAttribute('cy',cy - r*0.25); hl.setAttribute('r', Math.max(1, r*0.45));
            hl.setAttribute('fill','#ffffff'); hl.setAttribute('opacity','0.12'); svg.appendChild(hl);
          } else if(dotShape === 'square'){
            const s = r*2; const rx = Math.max(0, r*0.12);
            const rect = document.createElementNS(svg.namespaceURI,'rect');
            rect.setAttribute('x', cx - r); rect.setAttribute('y', cy - r); rect.setAttribute('width', s); rect.setAttribute('height', s);
            rect.setAttribute('rx', rx); rect.setAttribute('ry', rx);
            rect.setAttribute('fill', color); rect.setAttribute('class','dot-stroke'); svg.appendChild(rect);
          } else { // radial
            const main = document.createElementNS(svg.namespaceURI,'circle');
            main.setAttribute('cx',cx); main.setAttribute('cy',cy); main.setAttribute('r',r);
            main.setAttribute('fill', color); main.setAttribute('class','dot-stroke'); svg.appendChild(main);
            const inner = document.createElementNS(svg.namespaceURI,'circle');
            inner.setAttribute('cx',cx); inner.setAttribute('cy',cy); inner.setAttribute('r', Math.max(1, r*0.55));
            inner.setAttribute('fill','#ffffff'); inner.setAttribute('opacity','0.08'); svg.appendChild(inner);
          }
        }
      }
    }
  }

function attachEvents(){
  svg.addEventListener('pointerdown', onPaint);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);
  svg.addEventListener('pointercancel', onPointerUp);
  svg.addEventListener('pointerleave', onPointerUp);
  // ensure palette drag handlers attached
  attachPaletteDragEvents();
  gridSizeInput.addEventListener('change', ()=>{ resetGrid(); });
  dotSizeInput.addEventListener('input', ()=>{ dotSize = parseInt(dotSizeInput.value,10); if(dotSizeVal) dotSizeVal.textContent = dotSize; renderSvg(); });
  fillInput.addEventListener('input', ()=>{ fillFactor = parseInt(fillInput.value,10)/100; if(fillFactorVal) fillFactorVal.textContent = parseInt(fillInput.value,10); renderSvg(); });
  brightnessInput.addEventListener('input', ()=>{ brightness = parseInt(brightnessInput.value,10)/100; if(brightnessVal) brightnessVal.textContent = parseInt(brightnessInput.value,10); renderSvg(); });
  // add color from hex input or random
  addColorBtn.addEventListener('click', ()=>{
    const v = (addHexInput.value||'').trim();
    if(/^#?[0-9a-fA-F]{6}$/.test(v)){
      const hex = v.startsWith('#')?v:'#'+v;
      window.addPaletteColor(hex);
      addHexInput.value = '';
    } else {
      window.addPaletteColor(randomColor());
    }
  });
  exportPaletteBtn.addEventListener('click', exportPalette);
  importPaletteBtn.addEventListener('click', ()=> importPaletteInput.click());
  importPaletteInput.addEventListener('change', handleImportPalette);
  dotShapeSelect.addEventListener('change', ()=>{ dotShape = dotShapeSelect.value; renderSvg(); });
  if(diagSplitCheckbox) diagSplitCheckbox.addEventListener('change', ()=> renderSvg());
  saveDraftBtn.addEventListener('click', saveDraft);
  loadDraftBtn.addEventListener('click', loadDraft);
  deleteDraftBtn.addEventListener('click', deleteDraft);
  if(loadSampleBtn) loadSampleBtn.addEventListener('click', loadSampleArt);
  if(draftList) draftList.addEventListener('change', ()=>{
    if(draftNameInput && draftList.value) draftNameInput.value = draftList.value;
  });
  uploadBtn.addEventListener('click', ()=> imgUpload.click());
  imgUpload.addEventListener('change', handleImageUpload);
  eyedropBtn.addEventListener('click', toggleEyedropper);
  // value displays
  if(dotSizeVal) dotSizeVal.textContent = dotSizeInput.value;
  if(fillFactorVal) fillFactorVal.textContent = fillInput.value;
  if(brightnessVal) brightnessVal.textContent = brightnessInput.value;
  document.addEventListener('keydown', (e)=>{
    if((e.ctrlKey||e.metaKey) && !e.shiftKey && e.key.toLowerCase()==='z'){
      e.preventDefault();
      undo();
    }
  });
  // Apply acts as close; live updates handled by listeners
  applyDotBtn.addEventListener('click', ()=>{ inspectorEl.style.display='none'; currentSelectedIdx=null; });
  resetDotBtn.addEventListener('click', resetInspectorValues);
  deleteDotBtn.addEventListener('click', deleteInspectorDot);
  // inspector live updates
  dotBrightnessInput.addEventListener('input', ()=>{ if(currentSelectedIdx!=null) applyInspectorLive(); if(dotBrightnessVal) dotBrightnessVal.textContent = dotBrightnessInput.value; });
  dotFillInput.addEventListener('input', ()=>{ if(currentSelectedIdx!=null) applyInspectorLive(); if(dotFillVal) dotFillVal.textContent = dotFillInput.value; });
  selColorPreview.addEventListener('click', ()=>{ const c = prompt('Enter color hex', selColorPreview.style.background || selectedColor); if(c){ selColorPreview.style.background = c.startsWith('#')?c:'#'+c; if(currentSelectedIdx!=null) applyInspectorLive(); } });
  clearBtn.addEventListener('click', ()=>{ pushHistory(); cells = new Array(gridSize*gridSize).fill(null); renderSvg(); });
  exportSvgBtn.addEventListener('click', exportSVG);
  exportPngBtn.addEventListener('click', exportPNG);

  // quadrant button handlers: apply selected swatch color to quadrant
  const applyQuad = (qIdx, btn)=>{
    if(currentSelectedIdx==null) return;
    const color = selColorPreview.style.background || selectedColor;
    const c = cells[currentSelectedIdx] || {};
    c.quads = c.quads || [c.color||color, c.color||color, c.color||color, c.color||color];
    c.quads[qIdx] = color;
    // ensure main color reflects something sensible
    c.color = c.color || color;
    cells[currentSelectedIdx] = c;
    // update swatch
    if(btn) btn.style.background = color;
    renderSvg();
  };
  if(quad0Btn) quad0Btn.addEventListener('click', ()=> applyQuad(0, quad0Btn));
  if(quad1Btn) quad1Btn.addEventListener('click', ()=> applyQuad(1, quad1Btn));
  if(quad2Btn) quad2Btn.addEventListener('click', ()=> applyQuad(2, quad2Btn));
  if(quad3Btn) quad3Btn.addEventListener('click', ()=> applyQuad(3, quad3Btn));

  // palette trash: drop to delete palette color
  if(paletteTrash){
    paletteTrash.addEventListener('dragover', (e)=>{ e.preventDefault(); paletteTrash.classList.add('active'); });
    paletteTrash.addEventListener('dragleave', ()=>{ paletteTrash.classList.remove('active'); });
    paletteTrash.addEventListener('drop', (e)=>{
      e.preventDefault();
      paletteTrash.classList.remove('active');
      const src = e.dataTransfer.getData('text/plain');
      const srcIdx = parseInt(src,10);
      if(Number.isFinite(srcIdx) && srcIdx>=0 && srcIdx<palette.length){
        palette.splice(srcIdx,1);
        if(selectedColor===palette[srcIdx]) selectedColor = palette[0]||'#000000';
        setupPalette();
      }
    });
    // dragover/drop handling on palette container
    attachPaletteDragEvents();
  }
}

function onPaint(e){
  e.preventDefault();
  if(eyedropMode){
    const {x,y} = getSvgPointerLocation(e);
    if(x>=0 && y>=0 && x<gridSize && y<gridSize){
      const idx = y*gridSize + x;
      if(cells[idx]){
        selectedColor = cells[idx].color; palette.push(selectedColor); setupPalette();
        eyedropMode = false; eyedropBtn.classList.remove('active');
        return;
      }
    }
    sampleSVGAtClient(e.clientX, e.clientY).then(hex=>{
      if(hex){ selectedColor = hex; palette.push(hex); setupPalette(); }
      eyedropMode = false; eyedropBtn.classList.remove('active');
    }).catch(()=>{ eyedropMode = false; eyedropBtn.classList.remove('active'); });
    return;
  }

  const {x,y} = getSvgPointerLocation(e);
  if(x<0||y<0||x>=gridSize||y>=gridSize) return;
  const idx = y*gridSize + x;
  if(e.altKey){ openInspectorFor(idx); return; }

  isPointerDown = true;
  if(e.shiftKey){
    dragMode = e.button === 2 ? 'rect-erase' : 'rect';
  } else {
    dragMode = e.button === 2 ? 'erase' : 'paint';
  }
  dragStartCell = {x,y};
  if(e.pointerId && svg.setPointerCapture){
    svg.setPointerCapture(e.pointerId);
  }
  pushHistory();

  if(diagSplitCheckbox && diagSplitCheckbox.checked){
    if(dragMode === 'erase'){
      cells[idx] = null;
      renderSvg();
      return;
    }
    if(dragMode === 'rect' || dragMode === 'rect-erase') return;
    const existing = cells[idx] || { color: selectedColor, brightness: null, fill: null, quads: [null,null,null,null] };
    existing.quads = [selectedColor, selectedColor, selectedColor, selectedColor];
    existing.color = selectedColor;
    cells[idx] = existing;
    renderSvg();
    return;
  }

  if(dragMode === 'erase'){
    cells[idx] = null;
    renderSvg();
    return;
  }

  if(dragMode === 'rect' || dragMode === 'rect-erase') return;

  paintGridCell(e);
}

function onPointerMove(e){
  if(!isPointerDown) return;
  if(dragMode === 'paint'){
    paintGridCell(e);
    return;
  }
  if(dragMode === 'erase'){
    const {x,y} = getSvgPointerLocation(e);
    if(x<0||y<0||x>=gridSize||y>=gridSize) return;
    cells[y*gridSize + x] = null;
    renderSvg();
    return;
  }
}

function onPointerUp(e){
  if(!isPointerDown) return;
  if(dragMode === 'rect' && dragStartCell){
    const end = getSvgPointerLocation(e);
    fillRectCells(dragStartCell, end, selectedColor);
  }
  if(dragMode === 'rect-erase' && dragStartCell){
    const end = getSvgPointerLocation(e);
    removeRectCells(dragStartCell, end);
  }
  isPointerDown = false;
  dragMode = null;
  dragStartCell = null;
  if(e.pointerId && svg.hasPointerCapture && svg.hasPointerCapture(e.pointerId)){
    svg.releasePointerCapture(e.pointerId);
  }
}

function sampleSVGAtClient(clientX, clientY){
  return new Promise((resolve,reject)=>{
    const serializer = new XMLSerializer();
    const str = serializer.serializeToString(svg);
    const img = new Image();
    const blob = new Blob([str], {type:'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    img.onload = ()=>{
      try{
        const rect = svg.getBoundingClientRect();
        const canvas = document.createElement('canvas');
        canvas.width = rect.width; canvas.height = rect.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img,0,0,rect.width,rect.height);
        const x = Math.floor(clientX - rect.left);
        const y = Math.floor(clientY - rect.top);
        if(x<0||y<0||x>=canvas.width||y>=canvas.height){ URL.revokeObjectURL(url); resolve(null); return; }
        const d = ctx.getImageData(x,y,1,1).data;
        URL.revokeObjectURL(url);
        const hex = rgbToHex(d[0],d[1],d[2]);
        resolve(hex);
      }catch(err){ URL.revokeObjectURL(url); reject(err); }
    };
    img.onerror = (e)=>{ URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function handleImageUpload(e){
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    sourceImage.src = reader.result;
    imgPreviewWrap.style.display = 'block';
  };
  reader.readAsDataURL(f);
}

function toggleEyedropper(){
  eyedropMode = !eyedropMode;
  eyedropBtn.classList.toggle('active', eyedropMode);
  if(eyedropMode){
    imgPreviewWrap.style.display = 'block';
    sourceImage.style.cursor = 'crosshair';
    sourceImage.addEventListener('click', pickColorFromImage);
  } else {
    sourceImage.removeEventListener('click', pickColorFromImage);
  }
}

function pickColorFromImage(e){
  const img = e.currentTarget;
  const rect = img.getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left) * (img.naturalWidth / rect.width));
  const y = Math.round((e.clientY - rect.top) * (img.naturalHeight / rect.height));
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img,0,0);
  const data = ctx.getImageData(x,y,1,1).data;
  const hex = rgbToHex(data[0], data[1], data[2]);
  palette.push(hex);
  selectedColor = hex;
  setupPalette();
  // deactivate eyedropper after pick
  eyedropMode = false; eyedropBtn.classList.remove('active');
}

function openInspectorFor(idx){
  currentSelectedIdx = idx;
  const cellObj = cells[idx] || null;
  inspectorEl.style.display = 'block';
  selColorPreview.style.background = (cellObj && cellObj.color) ? cellObj.color : (selectedColor||'#000000');
  dotBrightnessInput.value = Math.round((cellObj && cellObj.brightness!=null) ? (cellObj.brightness*100) : (brightness*100));
  dotFillInput.value = Math.round((cellObj && cellObj.fill!=null) ? (cellObj.fill*100) : (fillFactor*100));
  if(dotBrightnessVal) dotBrightnessVal.textContent = dotBrightnessInput.value;
  if(dotFillVal) dotFillVal.textContent = dotFillInput.value;
  // quadrant controls (show only when diag split enabled)
  const quadControls = document.getElementById('quadControls');
  if(quadControls){
    quadControls.style.display = diagSplitCheckbox && diagSplitCheckbox.checked ? 'block' : 'none';
    if(diagSplitCheckbox && diagSplitCheckbox.checked){
      const quads = (cellObj && cellObj.quads) ? cellObj.quads : null;
      const base = (cellObj && cellObj.color) ? cellObj.color : (selectedColor||'#000000');
      if(quad0Btn) quad0Btn.style.background = quads ? (quads[0]||base) : base;
      if(quad1Btn) quad1Btn.style.background = quads ? (quads[1]||base) : base;
      if(quad2Btn) quad2Btn.style.background = quads ? (quads[2]||base) : base;
      if(quad3Btn) quad3Btn.style.background = quads ? (quads[3]||base) : base;
    }
  }
}

function applyInspectorValues(){
  if(currentSelectedIdx==null) return;
  const b = parseInt(dotBrightnessInput.value,10)/100;
  const f = parseInt(dotFillInput.value,10)/100;
  const color = selColorPreview.style.background || selectedColor;
  cells[currentSelectedIdx] = { color: color, brightness: b, fill: f };
  inspectorEl.style.display = 'none'; currentSelectedIdx = null; renderSvg();
}

function resetInspectorValues(){
  if(currentSelectedIdx==null) return;
  // reset per-dot overrides (use global)
  const c = cells[currentSelectedIdx];
  if(c) c.brightness = null, c.fill = null; else cells[currentSelectedIdx] = null;
  inspectorEl.style.display = 'none'; currentSelectedIdx = null; renderSvg();
}

function deleteInspectorDot(){
  if(currentSelectedIdx==null) return;
  cells[currentSelectedIdx] = null;
  inspectorEl.style.display = 'none'; currentSelectedIdx = null; renderSvg();
}

function rgbToHex(r,g,b){
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}

function setupPalette(){
  paletteEl.innerHTML = '';
  palette.forEach((c,i)=>{
    const btn = document.createElement('button');
    btn.style.background = c;
    btn.title = c;
    btn.draggable = true;
    btn.dataset.index = i;
    if(c===selectedColor) btn.classList.add('selected');
    btn.addEventListener('click', ()=>{ selectedColor = c; document.querySelectorAll('#palette button').forEach(b=>b.classList.remove('selected')); btn.classList.add('selected'); });
    btn.addEventListener('contextmenu', (ev)=>{ ev.preventDefault(); palette.splice(i,1); if(selectedColor===c) selectedColor = palette[0]||'#000000'; setupPalette(); });
    btn.addEventListener('dragstart', (e)=>{ e.dataTransfer.setData('text/plain', String(i)); btn.classList.add('dragging'); });
    btn.addEventListener('dragend', ()=>{ btn.classList.remove('dragging'); });
    paletteEl.appendChild(btn);
  });
  // dragover/drop handling on palette container
  paletteEl.addEventListener('dragover', (e)=>{ e.preventDefault(); });
  paletteEl.addEventListener('drop', (e)=>{
    e.preventDefault();
    const src = e.dataTransfer.getData('text/plain');
    const srcIdx = parseInt(src,10);
    const tgtBtn = e.target.closest('button');
    const tgtIdx = tgtBtn ? parseInt(tgtBtn.dataset.index,10) : palette.length-1;
    if(Number.isFinite(srcIdx) && Number.isFinite(tgtIdx) && srcIdx!==tgtIdx){
      const item = palette.splice(srcIdx,1)[0];
      palette.splice(tgtIdx,0,item);
      setupPalette();
    }
  });
  // dragover/drop handling on palette container
  attachPaletteDragEvents();
}

function hslToHex(h,s,l){
  s/=100; l/=100;
  const k = n => (n+ h/30)%12;
  const a = s * Math.min(l,1-l);
  const f = n => l - a * Math.max(-1, Math.min(k(n)-3, Math.min(9-k(n),1)));
  const r = Math.round(255*f(0));
  const g = Math.round(255*f(8));
  const b = Math.round(255*f(4));
  return `#${((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1)}`;
}

function randomColor(){
  return `#${Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0')}`;
}

function getExportSvgString(transparent = false){
  const sizePx = parseInt(exportSizeInput.value,10) || 2048;
  const clone = svg.cloneNode(true);
  clone.setAttribute('width', sizePx);
  clone.setAttribute('height', sizePx);
  if(transparent){
    const bg = clone.querySelector('rect');
    if(bg) bg.remove();
    const gridGroup = clone.querySelector('g');
    if(gridGroup) gridGroup.remove();
  }
  const serializer = new XMLSerializer();
  return serializer.serializeToString(clone);
}

function exportSVG(){
  const str = getExportSvgString(true);
  const blob = new Blob([str], {type:'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'dotty.svg'; a.click();
  URL.revokeObjectURL(url);
}

function exportPNG(){
  const str = getExportSvgString(true);
  const img = new Image();
  const svgBlob = new Blob([str], {type:'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(svgBlob);
  img.onload = ()=>{
    const canvas = document.createElement('canvas');
    const w = parseInt(exportSizeInput.value,10) || 2048; canvas.width = w; canvas.height = w;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,w,w);
    ctx.drawImage(img,0,0,w,w);
    URL.revokeObjectURL(url);
    const png = canvas.toDataURL('image/png');
    const a = document.createElement('a'); a.href = png; a.download = 'dotty.png'; a.click();
  };
  img.src = url;
}

// palette helpers
function exportPalette(){
  const data = JSON.stringify(palette);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'palette.json'; a.click();
  URL.revokeObjectURL(url);
}

function handleImportPalette(e){
  const f = e.target.files && e.target.files[0]; if(!f) return;
  const reader = new FileReader(); reader.onload = ()=>{
    try{ const arr = JSON.parse(reader.result); if(Array.isArray(arr)){ palette = arr.map(s=>s.startsWith('#')?s:'#'+s.replace('#','')); setupPalette(); } }
    catch(err){ console.error('Invalid palette file', err); }
  }; reader.readAsText(f);
}

// allow adding palette color programmatically
window.addPaletteColor = function(hex){ if(!hex) return; if(!hex.startsWith('#')) hex = '#'+hex; palette.push(hex); setupPalette(); };

function applyInspectorLive(){
  if(currentSelectedIdx==null) return;
  const b = parseInt(dotBrightnessInput.value,10)/100;
  const f = parseInt(dotFillInput.value,10)/100;
  const color = selColorPreview.style.background || selectedColor;
  const prev = cells[currentSelectedIdx] || {};
  const obj = { color: color, brightness: b, fill: f };
  if(prev.quads) obj.quads = prev.quads.slice();
  cells[currentSelectedIdx] = obj;
  renderSvg();
}

// prevent context menu on svg to allow right-click erase
svg.addEventListener('contextmenu', e=>e.preventDefault());

init();

(()=>{var y=Object.create;var u=Object.defineProperty;var p=Object.getOwnPropertyDescriptor;var B=Object.getOwnPropertyNames;var w=Object.getPrototypeOf,E=Object.prototype.hasOwnProperty;var s=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(t,o)=>(typeof require<"u"?require:t)[o]}):e)(function(e){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+e+'" is not supported')});var P=(e,t)=>()=>(t||e((t={exports:{}}).exports,t),t.exports);var D=(e,t,o,a)=>{if(t&&typeof t=="object"||typeof t=="function")for(let n of B(t))!E.call(e,n)&&n!==o&&u(e,n,{get:()=>t[n],enumerable:!(a=p(t,n))||a.enumerable});return e};var c=(e,t,o)=>(o=e!=null?y(w(e)):{},D(t||!e||!e.__esModule?u(o,"default",{value:e,enumerable:!0}):o,e));var T=P((m,g)=>{var f=c(s("https://cdn.jsdelivr.net/npm/buffer@6.0.3/index.min.js")),F=s("https://unpkg.com/ethers@5.7.2/dist/ethers.umd.min.js"),I=c(s("https://cdn.jsdelivr.net/npm/psd.js/dist/psd.min.js"));typeof s>"u"&&(window.require=function(){return console.warn("Dummy require called with arguments:",arguments),{}});typeof m>"u"&&(window.exports={});typeof g>"u"&&(window.module={exports:window.exports});window.Buffer=f.Buffer;console.log("Buffer polyfill loaded. TYPED_ARRAY_SUPPORT:",window.Buffer.TYPED_ARRAY_SUPPORT);console.log("Ethers.js loaded:",typeof window.ethers);window.PSD=I;console.log("psd.js loaded:",window.PSD);document.addEventListener("DOMContentLoaded",()=>{console.log("DOM fully loaded. Setting up file input...");let e=document.getElementById("mintFeeDisplay");e&&(e.innerText="Mint Fee: 0.001 ETH"),document.getElementById("psdFile").addEventListener("change",a=>{let n=a.target.files[0];if(!n){document.getElementById("status").innerText="No file selected.";return}console.log(`File selected: ${n.name}, size: ${n.size} bytes`),document.getElementById("status").innerText=`File chosen: ${n.name}`;let r=new FileReader;r.onprogress=i=>{if(i.lengthComputable){let l=(i.loaded/1048576).toFixed(2),d=(i.total/(1024*1024)).toFixed(2);console.log(`Reading file: ${l} / ${d} MB`),document.getElementById("status").innerText=`Reading file: ${l} / ${d} MB`}else console.log("onprogress fired, but length not computable."),document.getElementById("status").innerText="Reading file (unknown size)..."},r.onloadstart=()=>{console.log("File reading started."),document.getElementById("status").innerText="Starting file read..."},r.onerror=()=>{console.error("Error reading file."),document.getElementById("status").innerText="Error reading file."},r.onload=i=>{console.log("File reading complete. Parsing PSD..."),document.getElementById("status").innerText="File read complete. Parsing PSD...",window.PSD.fromArrayBuffer(i.target.result).then(l=>{l.parse(),console.log("Parsed PSD Layers:",l.tree().descendants()),document.getElementById("status").innerText="PSD parsed successfully. Ready to mint!";let d=document.getElementById("mintButton");d.disabled=!1,d.style.backgroundColor="#4CAF50"}).catch(l=>{console.error("Error parsing PSD:",l),document.getElementById("status").innerText="Error parsing PSD: "+l})},console.log("Initiating file read as ArrayBuffer..."),r.readAsArrayBuffer(n)}),document.getElementById("mintButton").addEventListener("click",()=>{console.log("Mint button clicked."),alert("Minting NFT... (placeholder functionality)")})})});T();})();

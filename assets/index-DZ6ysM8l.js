(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))n(o);new MutationObserver(o=>{for(const c of o)if(c.type==="childList")for(const i of c.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&n(i)}).observe(document,{childList:!0,subtree:!0});function r(o){const c={};return o.integrity&&(c.integrity=o.integrity),o.referrerPolicy&&(c.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?c.credentials="include":o.crossOrigin==="anonymous"?c.credentials="omit":c.credentials="same-origin",c}function n(o){if(o.ep)return;o.ep=!0;const c=r(o);fetch(o.href,c)}})();var A=function(t,e,r){if(r||arguments.length===2)for(var n=0,o=e.length,c;n<o;n++)(c||!(n in e))&&(c||(c=Array.prototype.slice.call(e,0,n)),c[n]=e[n]);return t.concat(c||Array.prototype.slice.call(e))};function C(t,e,r){var n=function(c){return t.apply(void 0,A([c],Array.from(e),!1))},o=r??t.lazy;return o===void 0?n:Object.assign(n,{lazy:o,lazyArgs:e})}function g(t,e,r){var n=t.length-e.length;if(n===0)return t.apply(void 0,Array.from(e));if(n===1)return C(t,e,r);throw new Error("Wrong number of arguments")}function f(){return g(h(!1),arguments)}var h=function(t){return function(e,r){for(var n={},o=0;o<e.length;o++){var c=e[o],i=t?r(c,o,e):r(c),u=i[0],d=i[1];n[u]=d}return n}};(function(t){function e(){return g(h(!0),arguments)}t.indexed=e})(f||(f={}));const T="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";let x=(t=21)=>{let e="",r=crypto.getRandomValues(new Uint8Array(t));for(;t--;)e+=T[r[t]&63];return e};const a=document.querySelector("#editor");let p=null;function m(t){return t.children.length>0?Array.from(t.children).filter(r=>r instanceof HTMLElement).filter(r=>!(r instanceof HTMLButtonElement)).map(r=>m(r)).reduce((r,n)=>r+n,""):t.innerText}function w(t){try{return decodeURIComponent(t)!==t}catch{return!1}}function y(){if(!(a instanceof HTMLDivElement))throw new Error("Can't find editor");const t=a.querySelector(".group"),e=t instanceof HTMLElement?m(t):a.innerText,r=p||b(e);p=r,a.innerText="";const n=L(r);a.appendChild(n)}a.addEventListener("input",y);y();function v(t){let e="";if(e=e+t.content,t.type==="url"&&t.params){e=e+"?";const r=new URLSearchParams(f(t.params,n=>[n.key,n.value.type==="url"?v(n.value):n.value.content])).toString();e=e+r}return e}function b(t){const e=x();try{const r=new URL(t);return{type:"url",encoded:w(t),id:e,content:r.search?t.split("?")[0]:t,params:Array.from(r.searchParams.entries()).map(([n,o])=>({key:n,value:b(o)}))}}catch{return{type:"string",id:e,content:t}}}function s(t,e,r){const n=document.createElement(t);return typeof e=="string"?n.classList.add(e):e.filter(o=>o).forEach(o=>n.classList.add(o)),r&&(n.innerText=r),n}function O(t,e){const r=s("div","toggle-box");r.setAttribute("contenteditable","false");const n=t?"decode":"encode",o=s("button",["toggle",n],n);return o.addEventListener("click",e),r.appendChild(o),r}function L(t){var o;const e=s("span","group");if(e.setAttribute("id",t.id),e.appendChild(O(!!t.encoded,c=>{c.target instanceof HTMLButtonElement&&t.id&&(t.encoded=!t.encoded,y())})),t.encoded){const c=s("span","encoded",v(t));return e.appendChild(c),e}const r=s("span","content",t.content);e.appendChild(r);const n=t.type==="url"?(o=t.params)==null?void 0:o.map(c=>{const i=s("span",[]),u=document.createElement("span");u.classList.add("key"),u.innerText=c.key,i.appendChild(u);const d=s("span","symbol","=");if(i.appendChild(d),c.value.type==="string"){const l=s("span","value",c.value.content);i.appendChild(l)}else{const l=s("span","value-box"),E=L(c.value);l.appendChild(E),i.appendChild(l)}return i}):[];return n==null||n.forEach((c,i)=>{const u=s("span","symbol",i===0?"?":"&");e.appendChild(u),e.appendChild(c)}),e}

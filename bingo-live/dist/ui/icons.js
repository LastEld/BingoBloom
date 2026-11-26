const paths={
 copy:'<rect x="8" y="7" width="12" height="14" rx="2"/><path d="M15 4H5v12"/>',
 flower:'<path d="M12 9c-7-8-10 2-4 4-5 5 2 10 5 4 4 6 11 0 5-4 7-3 1-10-4-5 2-7-7-7-5-1"/><circle cx="12" cy="12" r="2"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 layers:'<path d="m3 8 9-5 9 5-9 5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
 leaf:'<path d="M4 20c0-6 4-10 11-13M5 15C2 5 12 3 21 3c0 11-5 17-13 15"/>',
 gift:'<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8C1 7 6-4 12 8Zm0 0c11-1 6-12 0 0Z"/>',
 down:'<path d="m6 9 6 6 6-6"/>',chevron:'<path d="m9 5 7 7-7 7"/>',edit:'<path d="m4 16 11-11 4 4L8 20l-5 1zM14 6l4 4M16 4l1-1a2 2 0 0 1 3 0l1 1a2 2 0 0 1 0 3l-1 1"/>',
 play:'<path d="m7 4 13 8-13 8z"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M3 15v5h18v-5"/>',
 tune:'<path d="M3 6h7m4 0h7M3 12h12m4 0h2M3 18h3m4 0h11"/><circle cx="12" cy="6" r="2"/><circle cx="17" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
 check:'<path d="m4 12 5 5L20 6"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',plus:'<path d="M12 5v14M5 12h14"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5m10-5v5M3 11h18"/>',
 volume:'<path d="m11 5-5 4H3v6h3l5 4zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 mute:'<path d="m11 5-5 4H3v6h3l5 4zM16 9l6 6m0-6-6 6"/>',
 palette:'<path d="M12 3a9 9 0 1 0 0 18h1c2 0 3-2 2-4-1-2 0-3 2-3h1c5 0 4-11-6-11z"/><circle cx="7" cy="11" r=".65"/><circle cx="10" cy="7" r=".65"/><circle cx="15" cy="7" r=".65"/>',
 shuffle:'<path d="M3 6h3c4 0 7 12 11 12h4m-3-3 3 3-3 3M3 18h3c1 0 3-2 4-4m3-5c1-2 3-3 4-3h4m-3-3 3 3-3 3"/>',
 spark:'<path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v7l4 2"/>', line:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m6 17 11-11"/>',
 flip:'<rect x="3" y="4" width="13" height="16" rx="2"/><path d="m18 6 3 2v10l-3 2"/>',scratch:'<path d="m4 15 9-10m-9 15 15-15M10 20l10-11"/>',strike:'<path d="m4 15 16-6M5 19l13-5"/>',dissolve:'<path d="M14 4H4v16h10m3-15h2m-2 5h4m-4 6h2m1 4h1"/>',
 heart:'<path d="M12 20 4 12C-1 6 7 0 12 7c5-7 13-1 8 5z"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 boards:'<rect x="6" y="7" width="14" height="14" rx="2"/><path d="M16 4H4v13"/>',reset:'<path d="M3 11a9 9 0 1 1 2 7M3 5v6h6"/>',
 bulb:'<path d="M8 15a7 7 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Zm1 6h6"/>'
};
export const icon=(name,size=18)=>'<svg aria-hidden="true" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||'')+'</svg>';
export const blossom='<svg aria-hidden="true" viewBox="0 0 44 44" width="37" height="37">'+Array.from({length:8},(_,i)=>'<ellipse cx="22" cy="13" rx="6.8" ry="10.5" transform="rotate('+i*45+' 22 22)" fill="currentColor"/>').join('')+'<circle cx="22" cy="22" r="5.6" fill="#faf7e9"/></svg>';


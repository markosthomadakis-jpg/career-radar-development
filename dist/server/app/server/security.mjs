// HTTP security headers applied to every response.
// The page has no inline scripts or inline event handlers, so script-src needs no 'unsafe-inline'.
// cdnjs is allowed only for the pinned PDF.js reader (loaded with Subresource Integrity).
// Inline style attributes remain in templates, so style-src keeps 'unsafe-inline'.
export const CONTENT_SECURITY_POLICY=[
 "default-src 'self'",
 "script-src 'self' https://cdnjs.cloudflare.com",
 "worker-src 'self' blob: https://cdnjs.cloudflare.com",
 "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
 "font-src 'self' https://fonts.gstatic.com",
 "img-src 'self' data: blob:",
 "connect-src 'self' https://cdnjs.cloudflare.com",
 "object-src 'none'",
 "base-uri 'none'",
 "form-action 'self'",
 "frame-ancestors 'none'"
].join('; ');

const BASE_HEADERS={
 'x-content-type-options':'nosniff',
 'referrer-policy':'strict-origin-when-cross-origin',
 'x-frame-options':'DENY',
 'permissions-policy':'camera=(), microphone=(), geolocation=(), payment=()',
 'cross-origin-opener-policy':'same-origin'
};

// CSP_MODE=report-only lets the owner deploy behind a host that injects its own scripts,
// observe violations, then switch back to enforcement. Default is enforcement.
export function withSecurityHeaders(response,env={}){
 const headers=new Headers(response.headers);
 for(const [name,value] of Object.entries(BASE_HEADERS))if(!headers.has(name))headers.set(name,value);
 if(String(headers.get('content-type')||'').startsWith('text/html')){
  headers.set(env.CSP_MODE==='report-only'?'content-security-policy-report-only':'content-security-policy',CONTENT_SECURITY_POLICY);
 }
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}

// Browsers label cross-site requests; a cross-site call to a cost-bearing route is refused.
// Absent headers (non-browser clients) are not trusted either: those calls are bounded by the usage budget.
export function isCrossSite(request){
 const site=request.headers.get('sec-fetch-site');
 return site==='cross-site'||site==='same-site';
}

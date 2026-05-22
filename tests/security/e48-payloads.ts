export const ADMIN_DISPLAY_NAME_PAYLOADS = [
  `<script>window.__pwn=1</script>`,
  `<img src=x onerror=window.__pwn=1>`,
  `javascript:alert(1)`,
  `<svg/onload=alert(1)>`,
  `";alert(1);//`,
] as const;

export const ATTACHMENT_FILENAME_PAYLOADS = [
  `<script>alert(1)</script>.png`,
  `../../../etc/passwd`,
  `%2e%2e%2fsecret.pdf`,
  `🦊.png`,
  `very-long-name-${"a".repeat(200)}.png`,
] as const;

export const PICKER_SEARCH_PAYLOADS = [...ADMIN_DISPLAY_NAME_PAYLOADS] as const;

export const XSS_PAYLOADS = [
  `<script>alert(1)</script>`,
  `<img src=x onerror=alert(1)>`,
  `<svg/onload=alert(1)>`,
  `javascript:alert(1)`,
  `<iframe src="javascript:alert(1)">`,
  `"><script>alert(1)</script>`,
  `<<SCRIPT>alert(1)//<</SCRIPT>`,
  `<body onload=alert(1)>`,
  `';alert(String.fromCharCode(88,83,83))//`,
  `<style>@import 'javascript:alert(1)';</style>`,
  `<a href="javascript:alert(1)">click</a>`,
  `<meta http-equiv="refresh" content="0;url=javascript:alert(1)">`,
  `<details open ontoggle=alert(1)>`,
  `<input autofocus onfocus=alert(1)>`,
  `<select onchange=alert(1)><option>x</option></select>`,
  `<form action="javascript:alert(1)"><button>submit</button></form>`,
  `<object data="javascript:alert(1)">`,
  `<embed src="javascript:alert(1)">`,
  `<link rel=stylesheet href="javascript:alert(1)">`,
  `<base href="javascript:alert(1)//">`,
  `'">><img src=x onerror=alert(1)>`,
  `</title><script>alert(1)</script>`,
  `abc<script>alert(1)</script>`,
  `<math href="javascript:alert(1)">CLICK</math>`,
  `<table background="javascript:alert(1)">`,
  `<div style="width:expression(alert(1))">`,
  `<div style="background:url(javascript:alert(1))">x</div>`,
  `<video><source onerror="alert(1)"></video>`,
  `<audio src=x onerror=alert(1)>`,
  `<marquee onstart=alert(1)>x</marquee>`,
  `<script src="data:text/javascript,alert(1)"></script>`,
  `<img src="data:image/svg+xml,<svg onload=alert(1)>">`,
] as const;

export const CSV_INJECTION_PAYLOADS = [
  `=SUM(1+2)`,
  `=cmd|'/c calc'!A1`,
  `+1+2`,
  `-1+2`,
  `@SUM(1+2)`,
  `=HYPERLINK("http://attacker.com","click")`,
  `\t=SUM(1+2)`,
  `\r=SUM(1+2)`,
  `\n=SUM(1+2)`,
  `,=SUM(1+2)`,
] as const;

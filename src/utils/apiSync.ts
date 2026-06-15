export async function apiSync(action: string, payload: any, customSecret?: string) {
  const secret = customSecret !== undefined 
    ? customSecret 
    : (typeof window !== 'undefined' ? localStorage.getItem('dsaAdminSecret') || '' : '');
  
  return fetch('/api/github', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': secret
    },
    body: JSON.stringify({ action, payload })
  });
}

{
  id: 'confirmtkt',
  name: 'ConfirmTkt',
  countries: ['India'],
  endpoint: 'https://securedapi.confirmtkt.com/api/platform/register?mobileNumber=',
  method: 'GET',
  headers: { 'User-Agent': '...' },
  bodyTemplate: () => ({}),
  requires: [],
  identifier: '"success"',  // adjust based on actual response
}

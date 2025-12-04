const fs = require('fs');
const path = require('path');

describe('user-service smoke', () => {
  test('has package.json and start script', () => {
    const root = path.resolve(__dirname, '..');
    const pkg = require(path.join(root, 'package.json'));
    expect(pkg).toBeDefined();
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.start || pkg.scripts.dev).toBeTruthy();
  });

  test('src/server.js exists', () => {
    const serverPath = path.resolve(__dirname, '..', 'src', 'server.js');
    expect(fs.existsSync(serverPath)).toBe(true);
  });
});

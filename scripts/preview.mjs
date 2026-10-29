import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'

const root = resolve('dist/angular-crm-property-desk/browser')
const portIndex = process.argv.indexOf('--port')
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env['PORT'] || 4400)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
}
await stat(resolve(root, 'index.html')).catch(() => {
  throw new Error('Production build not found. Run npm run build first.')
})
createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405)
    res.end()
    return
  }
  try {
    const path = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname)
    let file = resolve(root, '.' + path)
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403)
      res.end()
      return
    }
    if (path === '/' || (!extname(path) && !path.startsWith('/api/')))
      file = resolve(root, 'index.html')
    const content = await readFile(file)
    res.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    })
    res.end(req.method === 'HEAD' ? undefined : content)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  }
}).listen(port, '0.0.0.0', () => console.log('Haven preview: http://localhost:' + port))

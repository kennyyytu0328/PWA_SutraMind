import { readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

function rasterize(svgPath, outBaseName) {
  const svg = readFileSync(svgPath)
  for (const size of [192, 512]) {
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
      .render()
      .asPng()
    const path = `public/icons/${outBaseName}-${size}.png`
    writeFileSync(path, png)
    console.log(`wrote ${path} (${png.length} bytes)`)
  }
}

rasterize('public/icons/icon.svg', 'icon')
rasterize('public/icons/icon-maskable.svg', 'icon-maskable')

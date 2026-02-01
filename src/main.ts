import colorsea from 'colorsea'
import { palettes, type Palette } from './palettes'

// Matches #RGB, #RGBA, #RRGGBB, #RRGGBBAA - captures color and alpha separately
const HEX_COLOR_REGEX = /#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?\b|#([0-9a-fA-F]{3})([0-9a-fA-F])?\b/g

function normalizeHex(hex: string): string {
  hex = hex.replace('#', '')
  // Handle 3-digit hex (RGB)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }
  // Handle 4-digit hex (RGBA) - extract just the color part
  if (hex.length === 4) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }
  return '#' + hex.slice(0, 6).toLowerCase()
}

function findNearestColor(targetHex: string, palette: Palette): string {
  const target = colorsea(normalizeHex(targetHex))
  let nearestColor = palette.colors[0]
  let minDistance = Infinity

  for (const paletteHex of palette.colors) {
    const paletteColor = colorsea(paletteHex)
    const distance = target.deltaE(paletteColor, 'cie2000')

    if (distance < minDistance) {
      minDistance = distance
      nearestColor = paletteHex
    }
  }

  return nearestColor
}

function replaceColors(content: string, palette: Palette): string {
  return content.replace(HEX_COLOR_REGEX, (match) => {
    const hex = match.replace('#', '')
    let colorPart: string
    let alphaPart = ''

    if (hex.length === 8) {
      // #RRGGBBAA
      colorPart = '#' + hex.slice(0, 6)
      alphaPart = hex.slice(6, 8)
    } else if (hex.length === 4) {
      // #RGBA
      colorPart = '#' + hex.slice(0, 3)
      alphaPart = hex[3] + hex[3] // Expand single alpha digit to two
    } else {
      // #RGB or #RRGGBB (no alpha)
      colorPart = match
    }

    const newColor = findNearestColor(colorPart, palette)
    return newColor + alphaPart
  })
}

function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function init(): void {
  const fileInput = document.getElementById('file-input') as HTMLInputElement
  const paletteSelect = document.getElementById('palette-select') as HTMLSelectElement
  const processBtn = document.getElementById('process-btn') as HTMLButtonElement
  const status = document.getElementById('status') as HTMLElement
  const preview = document.getElementById('preview') as HTMLPreElement

  // Populate palette dropdown
  for (const palette of palettes) {
    const option = document.createElement('option')
    option.value = palette.name
    option.textContent = palette.name
    paletteSelect.appendChild(option)
  }

  let fileContent = ''
  let fileName = ''

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0]
    if (!file) return

    fileName = file.name
    const reader = new FileReader()
    reader.onload = (e) => {
      fileContent = e.target?.result as string
      status.textContent = `Loaded: ${fileName}`
      preview.textContent = fileContent.slice(0, 500) + (fileContent.length > 500 ? '...' : '')
      processBtn.disabled = false
    }
    reader.readAsText(file)
  })

  processBtn.addEventListener('click', () => {
    if (!fileContent) {
      status.textContent = 'Please select a file first'
      return
    }

    const selectedPalette = palettes.find(p => p.name === paletteSelect.value)
    if (!selectedPalette) {
      status.textContent = 'Please select a palette'
      return
    }

    const processedContent = replaceColors(fileContent, selectedPalette)
    const newFileName = fileName.replace(/(\.[^.]+)$/, `-${selectedPalette.name.toLowerCase().replace(/\s+/g, '-')}$1`)

    downloadFile(processedContent, newFileName)
    status.textContent = `Downloaded: ${newFileName}`
    preview.textContent = processedContent.slice(0, 500) + (processedContent.length > 500 ? '...' : '')
  })
}

document.addEventListener('DOMContentLoaded', init)

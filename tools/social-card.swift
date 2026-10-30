// Draws the default social card of the site: the image that link previews show
// for a page without a banner of its own (see `metaImage` in _includes/head.html).
// A copy of tools/social-card.swift on the Elytra site, with the colours and the
// text of InTransit. The layout follows the card of dezinezync.com: the app icon
// on the left; the name, a line about the app, and the address on the right. The
// background is the gradient of the closing band in light mode
// (_sass/site/_closing.scss): InTransit's blue comes in from the leading edge,
// with a soft diagonal ray.
//
// Usage, from the root of the repository:
//   TOOLCHAINS=com.apple.dt.toolchain.XcodeDefault xcrun swift tools/social-card.swift <app icon>
//
//   app icon  A PNG file of the light (default) app icon, 1024 px, with its rounded
//             corners: AppIcon-iOS-Default-1024@1x.png. The card draws it at 422
//             points, so a file smaller than 844 px looks soft.
//
// It writes into assets/images/home/:
//   social-card@2x-p3.png  2400 x 1260, Display P3. The card is drawn at this size.
//   social-card-p3.jpg     1200 x 630, Display P3.
//   social-card.jpg        1200 x 630, sRGB. The page meta tags use this one,
//                          because some link preview services ignore colour profiles.

import AppKit
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

let outputFolder = "assets/images/home"

// The layout, in points of the 1200 x 630 card, measured from the top left.
let cardSize = CGSize(width: 1200, height: 630)
let scale: CGFloat = 2
let iconFrame = CGRect(x: 88, y: 104, width: 422, height: 422)
let textX: CGFloat = 573

struct TextLine {
  let text: String
  let size: CGFloat
  let weight: NSFont.Weight
  let color: CGColor
  // The distance of the baseline from the top of the card.
  let baseline: CGFloat
}

func fail(_ message: String) -> Never {
  FileHandle.standardError.write(Data((message + "\n").utf8))
  exit(1)
}

guard CommandLine.arguments.count == 2
else {
  fail("Usage: xcrun swift tools/social-card.swift <app icon>")
}
let iconPath = CommandLine.arguments[1]

func makeContext(size: CGSize, space: CGColorSpace) -> CGContext {
  guard let context = CGContext(data: nil, width: Int(size.width), height: Int(size.height), bitsPerComponent: 8, bytesPerRow: 0, space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
  else {
    fail("Could not make a drawing context of \(size).")
  }
  context.interpolationQuality = .high
  return context
}

func write(_ image: CGImage, to path: String, type: UTType, quality: CGFloat? = nil) {
  let url = URL(fileURLWithPath: path)
  guard let destination = CGImageDestinationCreateWithURL(url as CFURL, type.identifier as CFString, 1, nil)
  else {
    fail("Could not write \(path).")
  }
  var options: [CFString: Any] = [:]
  if let quality {
    options[kCGImageDestinationLossyCompressionQuality] = quality
  }
  CGImageDestinationAddImage(destination, image, options as CFDictionary)
  guard CGImageDestinationFinalize(destination)
  else {
    fail("Could not write \(path).")
  }
  print("\(path): \(image.width) x \(image.height)")
}

// Draws `image` into a new context of `size` in `space`. Core Graphics converts
// the colours when the spaces differ.
func redraw(_ image: CGImage, size: CGSize, space: CGColorSpace) -> CGImage {
  let context = makeContext(size: size, space: space)
  context.draw(image, in: CGRect(origin: .zero, size: size))
  guard let result = context.makeImage()
  else {
    fail("Could not make the image of \(size).")
  }
  return result
}

guard let displayP3 = CGColorSpace(name: CGColorSpace.displayP3),
      let sRGB = CGColorSpace(name: CGColorSpace.sRGB)
else {
  fail("Could not make the colour spaces.")
}

guard let iconSource = CGImageSourceCreateWithURL(URL(fileURLWithPath: iconPath) as CFURL, nil),
      let icon = CGImageSourceCreateImageAtIndex(iconSource, 0, nil)
else {
  fail("Could not read \(iconPath).")
}
if CGFloat(icon.width) < iconFrame.width * scale {
  print("Note: the icon is \(icon.width) px, smaller than the \(Int(iconFrame.width * scale)) px that the card draws, so it looks soft.")
}

func p3(_ red: CGFloat, _ green: CGFloat, _ blue: CGFloat, _ alpha: CGFloat) -> CGColor {
  guard let color = CGColor(colorSpace: displayP3, components: [red, green, blue, alpha])
  else {
    fail("Could not make a Display P3 colour.")
  }
  return color
}

// The text colours of `.mt-closing` in light mode, in Display P3 ($mt-hue is 261):
//   --_text         oklch(0.23 0.012 261)          0.1034 0.1135 0.1339
//   --_text-2       oklch(0.23 0.012 261 / 0.82)
//   --_accent       oklch(0.5 0.19 261)            0.1745 0.3470 0.7750
//   --_icon-shadow  oklch(0.45 0.17 261 / 0.28)    0.1475 0.2980 0.6706
let title = p3(0.1034, 0.1135, 0.1339, 1)
let secondary = p3(0.1034, 0.1135, 0.1339, 0.82)
let accent = p3(0.1745, 0.3470, 0.7750, 1)
let iconShadow = p3(0.1475, 0.2980, 0.6706, 0.28)

let lines = [
  TextLine(text: "InTransit", size: 84, weight: .bold, color: title, baseline: 251),
  TextLine(text: "Your metro ride, stop by stop,", size: 30, weight: .regular, color: secondary, baseline: 319),
  TextLine(text: "in nine cities of India", size: 30, weight: .regular, color: secondary, baseline: 361),
  TextLine(text: "intransit.app", size: 30, weight: .semibold, color: accent, baseline: 444),
]

let pixelSize = CGSize(width: cardSize.width * scale, height: cardSize.height * scale)
let context = makeContext(size: pixelSize, space: displayP3)
// Draw in points. Core Graphics has its origin at the bottom left, so `flip`
// turns a distance from the top into a y coordinate.
context.scaleBy(x: scale, y: scale)
func flip(_ top: CGFloat) -> CGFloat {
  cardSize.height - top
}

// The background, as `.mt-closing` in light mode. The OKLCH colours of the CSS,
// in Display P3:
//   --mt-closing-bg  oklch(0.99 0.004 261)        0.9824 0.9872 0.9967
//   --_wash-strong   oklch(0.78 0.12 261 / 0.5)   0.5825 0.7152 0.9962
//   --_wash-soft     oklch(0.86 0.08 261 / 0.28)  0.7278 0.8206 1.0106
// The blue of the soft wash is a little outside Display P3, so it is 1 here.
// The band fades the top of the glow into the section above it. The card has
// no section above it, so it leaves that layer out.
func gradient(_ colors: [CGColor], _ locations: [CGFloat]) -> CGGradient {
  guard let gradient = CGGradient(colorsSpace: displayP3, colors: colors as CFArray, locations: locations)
  else {
    fail("Could not make a gradient.")
  }
  return gradient
}
let washStrong = p3(0.5825, 0.7152, 0.9962, 0.5)
let washSoft = p3(0.7278, 0.8206, 1, 0.28)
let washClear = p3(0.7278, 0.8206, 1, 0)

context.setFillColor(p3(0.9824, 0.9872, 0.9967, 1))
context.fill(CGRect(origin: .zero, size: cardSize))

// The glow: radial-gradient(ellipse 58% 80% at 0% 42%, strong 0%, soft 42%,
// transparent 72%). The ellipse is a circle of radius 1, scaled to its radii.
context.saveGState()
context.translateBy(x: 0, y: flip(cardSize.height * 0.42))
context.scaleBy(x: cardSize.width * 0.58, y: cardSize.height * 0.8)
context.drawRadialGradient(gradient([washStrong, washSoft, washClear], [0, 0.42, 0.72]), startCenter: .zero, startRadius: 0, endCenter: .zero, endRadius: 1, options: [])
context.restoreGState()

// The ray: linear-gradient(112deg, soft 0%, transparent 38%). CSS measures the
// angle clockwise from the top, and the gradient line runs through the centre,
// long enough that the corners get the colours at its two ends.
let angle = 112 * CGFloat.pi / 180
let direction = CGPoint(x: sin(angle), y: -cos(angle))
let half = (cardSize.width * abs(sin(angle)) + cardSize.height * abs(cos(angle))) / 2
let centre = CGPoint(x: cardSize.width / 2, y: cardSize.height / 2)
let rayStart = CGPoint(x: centre.x - direction.x * half, y: flip(centre.y - direction.y * half))
let rayEnd = CGPoint(x: centre.x + direction.x * half, y: flip(centre.y + direction.y * half))
context.drawLinearGradient(gradient([washSoft, washClear], [0, 0.38]), start: rayStart, end: rayEnd, options: [])

// The icon, with a soft blue shadow below it, as the icon of the band. Shadow
// offsets and blur are in pixels.
context.saveGState()
context.setShadow(offset: CGSize(width: 0, height: -14 * scale), blur: 44 * scale, color: iconShadow)
context.draw(icon, in: CGRect(x: iconFrame.minX, y: flip(iconFrame.maxY), width: iconFrame.width, height: iconFrame.height))
context.restoreGState()

// The text, in the system font (SF Pro on macOS).
for line in lines {
  let font = NSFont.systemFont(ofSize: line.size, weight: line.weight)
  let attributes: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: line.color,
    .kern: line.size >= 60 ? -1.2 : 0,
  ]
  let text = CTLineCreateWithAttributedString(NSAttributedString(string: line.text, attributes: attributes))
  context.textPosition = CGPoint(x: textX, y: flip(line.baseline))
  CTLineDraw(text, context)
}

guard let card = context.makeImage()
else {
  fail("Could not make the card.")
}

try? FileManager.default.createDirectory(atPath: outputFolder, withIntermediateDirectories: true)
write(card, to: "\(outputFolder)/social-card@2x-p3.png", type: .png)
write(redraw(card, size: cardSize, space: displayP3), to: "\(outputFolder)/social-card-p3.jpg", type: .jpeg, quality: 0.9)
write(redraw(card, size: cardSize, space: sRGB), to: "\(outputFolder)/social-card.jpg", type: .jpeg, quality: 0.9)

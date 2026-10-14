// Regenerate the 1024px App Store icon with:
// swift ios/generate-icon.swift
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let size = 1024
let output = URL(fileURLWithPath: "ios/MRLCFocus/Assets.xcassets/AppIcon.appiconset/AppIcon.png")
let context = CGContext(
    data: nil,
    width: size,
    height: size,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
)!
context.setAllowsAntialiasing(true)
context.setShouldAntialias(true)

let navy = CGColor(red: 0.06, green: 0.17, blue: 0.23, alpha: 1)
let teal = CGColor(red: 0.08, green: 0.53, blue: 0.49, alpha: 1)
let mint = CGColor(red: 0.83, green: 0.95, blue: 0.89, alpha: 1)

context.setFillColor(navy)
context.fill(CGRect(x: 0, y: 0, width: size, height: size))
context.setFillColor(teal)
context.addPath(CGPath(roundedRect: CGRect(x: 118, y: 118, width: 788, height: 788), cornerWidth: 188, cornerHeight: 188, transform: nil))
context.fillPath()

context.setStrokeColor(mint)
context.setLineWidth(55)
context.strokeEllipse(in: CGRect(x: 276, y: 278, width: 472, height: 472))
context.setLineCap(.round)
context.setLineWidth(56)
context.move(to: CGPoint(x: 512, y: 512))
context.addLine(to: CGPoint(x: 512, y: 655))
context.move(to: CGPoint(x: 512, y: 512))
context.addLine(to: CGPoint(x: 615, y: 455))
context.strokePath()

context.setFillColor(mint)
context.fillEllipse(in: CGRect(x: 485, y: 485, width: 54, height: 54))

let image = context.makeImage()!
let destination = CGImageDestinationCreateWithURL(output as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(destination, image, nil)
guard CGImageDestinationFinalize(destination) else { fatalError("Could not write app icon") }

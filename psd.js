export let ColorMode

;(function(ColorMode) {
  ColorMode[(ColorMode["Bitmap"] = 0)] = "Bitmap"
  ColorMode[(ColorMode["Grayscale"] = 1)] = "Grayscale"
  ColorMode[(ColorMode["Indexed"] = 2)] = "Indexed"
  ColorMode[(ColorMode["RGB"] = 3)] = "RGB"
  ColorMode[(ColorMode["CMYK"] = 4)] = "CMYK"
  ColorMode[(ColorMode["Multichannel"] = 7)] = "Multichannel"
  ColorMode[(ColorMode["Duotone"] = 8)] = "Duotone"
  ColorMode[(ColorMode["Lab"] = 9)] = "Lab"
})(ColorMode || (ColorMode = {}))

export let SectionDividerType

;(function(SectionDividerType) {
  SectionDividerType[(SectionDividerType["Other"] = 0)] = "Other"
  SectionDividerType[(SectionDividerType["OpenFolder"] = 1)] = "OpenFolder"
  SectionDividerType[(SectionDividerType["ClosedFolder"] = 2)] = "ClosedFolder"
  SectionDividerType[(SectionDividerType["BoundingSectionDivider"] = 3)] =
    "BoundingSectionDivider"
})(SectionDividerType || (SectionDividerType = {}))

export let LayerCompCapturedInfo

;(function(LayerCompCapturedInfo) {
  LayerCompCapturedInfo[(LayerCompCapturedInfo["None"] = 0)] = "None"
  LayerCompCapturedInfo[(LayerCompCapturedInfo["Visibility"] = 1)] =
    "Visibility"
  LayerCompCapturedInfo[(LayerCompCapturedInfo["Position"] = 2)] = "Position"
  LayerCompCapturedInfo[(LayerCompCapturedInfo["Appearance"] = 4)] =
    "Appearance"
})(LayerCompCapturedInfo || (LayerCompCapturedInfo = {}))

const tesseract = require("node-tesseract-ocr")
const { pdf } = require("pdf-to-img");
const fs = require('fs')
const sharp = require('sharp');
const outData = {}

const config = {
  lang: "eng",
  oem: 1,
  psm: 3,
}

async function main() {
  const doc = await pdf("room-usage.pdf", { scale: 2 });

  let i = 0

  for await (const page of doc) {
    i++
    const originPath = `exports/pages/${i}.png`
    const outPath = `exports/subjectname/${i}.png`
    fs.writeFileSync(originPath, page)

    await sharp(originPath).extract({ width: 1089, height: 80, left: 248, top: 59 }).toFile(outPath)

    const roomCode = (await tesseract.recognize(outPath, config)).trim().replaceAll("\n", "")

    outData[roomCode] = []

    const debugSharp = sharp(originPath)

    let i2 = 0

    const debugPoints = []
    const promises = []

    const svgImage = `
        <svg width="10" height="10">
        <rect width="10" height="10" fill="#FF0000"/>
        </svg>
        `;
    const svgBuffer = Buffer.from(svgImage);

    for (let y = 226; y < 974 + 188; y += 188) {
      let rowData = new Array(10).fill(0)
      let ri = -1

      for (let x = 178; x < 1420 + 138; x += 138) {
        ri += 1
        i2 = i2 + 1

        let tempPromi = new Promise(async (resolve, reject) => {
          const tx = x
          const ty = y
          const ti = i
          const rii = ri
          const ti2 = i2
          const boxOutPath = `exports/box/${ti}-${ti2}.png`

          console.log(boxOutPath, "Working...")

          const sharpUser = sharp(originPath).extract({ width: 138 - 24, height: 188 - 24, left: tx + 12, top: ty + 12 })
          sharpUser.resize(50)
          await sharpUser.toFile(boxOutPath)

          let markFound = false

          const bdata = await sharpUser.raw().toBuffer({ resolveWithObject: true })
          for (const px of bdata.data) {
            if (px < 200) {
              markFound = true
            }
          }

          if (markFound) {
            rowData[rii] = 1
          } else {
            rowData[rii] = 0
          }

          debugPoints.push({
            input: svgBuffer,
            top: ty,
            left: tx,
          })

          console.log(boxOutPath, "Completed!")

          resolve()
        })

        //await tempPromi

        promises.push(tempPromi)
      }

      await Promise.all(promises)

      outData[roomCode].push(rowData)

      fs.writeFileSync("out.json", JSON.stringify(outData))
    }

    debugSharp.composite(debugPoints)
    await debugSharp.toFile("debug.png")
  }

  fs.writeFileSync("out.json", JSON.stringify(outData))
}

main()

/*
tesseract
  .recognize("image.png", config)
  .then((text) => {
    console.log("Result:", text.replaceAll(" ", ""))
  })
  .catch((error) => {
    console.log(error.message)
  })
*/
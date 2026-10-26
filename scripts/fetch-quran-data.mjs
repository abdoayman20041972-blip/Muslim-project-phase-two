import { mkdir, readFile, writeFile } from 'node:fs/promises'

const ENDPOINT = 'https://api.alquran.cloud/v1/surah/{n}/quran-uthmani'
const META_PATH = 'src/quran-meta.ts'
const OUTPUT_PATH = 'src/app/features/quran/data/quran-uthmani.json'
const REQUEST_DELAY_MS = 1000
const DEFAULT_RETRY_DELAY_MS = 5000
const MAX_RETRIES = 5

const meta = await readFile(META_PATH, 'utf8')
const expected = new Map(
  [...meta.matchAll(/\{ number: (\d+), .*?numberOfAyahs: (\d+),/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]),
)

if (expected.size !== 114) throw new Error('quran-meta must contain exactly 114 surahs')

const result = {}
const failures = []
let retryCount = 0

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

for (let number = 1; number <= 114; number += 1) {
  const url = ENDPOINT.replace('{n}', String(number))
  let response

  for (let attempt = 0; ; attempt += 1) {
    response = await fetch(url)

    if (response.status !== 429) break

    if (attempt >= MAX_RETRIES) {
      throw new Error('rate-limit for surah ' + number + ' after ' + MAX_RETRIES + ' retries')
    }

    const retryAfter = Number(response.headers.get('Retry-After'))
    const delayMs =
      Number.isFinite(retryAfter) && retryAfter >= 0
        ? retryAfter * 1000
        : DEFAULT_RETRY_DELAY_MS

    retryCount += 1
    process.stdout.write(
      'surah ' + number + ': 429, retry ' + (attempt + 1) + '/' + MAX_RETRIES + ' after ' + delayMs + 'ms\n',
    )
    await sleep(delayMs)
  }

  if (!response.ok) throw new Error('bad-response for surah ' + number + ': ' + response.status)

  const json = await response.json()
  const ayahs = (json?.data?.ayahs ?? []).map((ayah) => ({
    number: ayah.number,
    numberInSurah: ayah.numberInSurah,
    text: ayah.text,
  }))
  result[String(number)] = ayahs

  const expectedCount = expected.get(number)
  if (ayahs.length !== expectedCount) {
    failures.push({ number, expected: expectedCount, actual: ayahs.length })
  }

  process.stdout.write('surah ' + number + ': ' + ayahs.length + ' ayahs\n')
  if (number < 114) await sleep(REQUEST_DELAY_MS)
}

if (failures.length) {
  console.error(JSON.stringify({ completed: 114 - failures.length, failed: failures.length, failures }, null, 2))
  process.exit(1)
}

await mkdir('src/app/features/quran/data', { recursive: true })
await writeFile(OUTPUT_PATH, JSON.stringify(result), 'utf8')

const parsed = JSON.parse(await readFile(OUTPUT_PATH, 'utf8'))
const parsedSurahCount = Object.keys(parsed).length
const parsedAyahCount = Object.values(parsed).reduce((sum, ayahs) => sum + ayahs.length, 0)

if (parsedSurahCount !== 114 || parsedAyahCount !== 6236) {
  throw new Error(
    'output verification failed: expected 114 surahs / 6236 ayahs, got ' +
      parsedSurahCount +
      ' surahs / ' +
      parsedAyahCount +
      ' ayahs',
  )
}

console.log(
  JSON.stringify(
    {
      outputVerification: 'PASS',
      surahs: parsedSurahCount,
      totalAyahs: parsedAyahCount,
    },
    null,
    2,
  ),
)

console.log(JSON.stringify({ completed: 114, failed: 0, totalAyahs: parsedAyahCount, retries: retryCount, output: OUTPUT_PATH }, null, 2))

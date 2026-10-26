import { useEffect, useState } from 'react'
import { Row, Section, Choice } from '../settingsPrimitives'
import { APP_SETTINGS_KEYS, emitSettingsChanged, readSetting } from '../../../settings'

export const HADITH_FONT_KEY = 'hadith_font'
export const HADITH_NOTE_KEY = APP_SETTINGS_KEYS.hadithShowNote
export const PROPHET_FONT_KEY = 'prophet_font'
export const PROPHET_QUESTION_KEY = APP_SETTINGS_KEYS.prophetShowQuestion

function ReadingToggles({
  fontKey,
  noteKey,
  fontLabel,
}: {
  fontKey: string
  noteKey?: string
  fontLabel: string
}) {
  const [font, setFont] = useState(() => readSetting(fontKey, 'md'))
  const [note, setNote] = useState(() => (noteKey ? readSetting(noteKey, '1') !== '0' : true))

  useEffect(() => {
    const refresh = () => {
      setFont(readSetting(fontKey, 'md'))
      if (noteKey) setNote(readSetting(noteKey, '1') !== '0')
    }
    window.addEventListener('azkar-settings-changed', refresh)
    return () => window.removeEventListener('azkar-settings-changed', refresh)
  }, [fontKey, noteKey])

  const save = (k: string, v: string) => {
    localStorage.setItem(k, v)
    emitSettingsChanged()
  }

  return (
    <>
      <Row title={fontLabel} description="حجم خط النص لتسهيل القراءة." stacked>
        <Choice
          current={font}
          onChange={(v) => {
            setFont(v)
            save(fontKey, v)
          }}
          labels={{ sm: 'صغير', md: 'متوسط', lg: 'كبير' }}
        />
      </Row>
      {noteKey && (
        <Row title="ملاحظات وشرح" description="إظهار فائدة مختصرة أسفل كل نص." last>
          <button
            onClick={() => {
              const n = !note
              setNote(n)
              save(noteKey, n ? '1' : '0')
            }}
            aria-pressed={note}
            className={`min-h-11 rounded-xl border px-4 py-2 text-[10px] font-bold ${note ? 'border-azkar-teal bg-azkar-teal text-azkar-card' : 'border-azkar-gold-soft bg-azkar-bg-alt text-azkar-ink-soft'}`}
          >
            {note ? 'ظاهرة' : 'مخفية'}
          </button>
        </Row>
      )}
    </>
  )
}

export function HadithSection() {
  return (
    <Section title="تفضيلات الأحاديث">
      <ReadingToggles fontKey={HADITH_FONT_KEY} noteKey={HADITH_NOTE_KEY} fontLabel="حجم خط الحديث" />
    </Section>
  )
}

export function ProphetsSection() {
  return (
    <Section title="تفضيلات قصص الأنبياء">
      <ReadingToggles
        fontKey={PROPHET_FONT_KEY}
        noteKey={PROPHET_QUESTION_KEY}
        fontLabel="حجم خط القصة"
      />
    </Section>
  )
}

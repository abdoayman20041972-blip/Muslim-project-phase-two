import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuranTafsir } from './useQuranTafsir'
import { emitSettingsChanged } from '../../settings'
const ayah = (n: number) => ({ number: n, numberInSurah: n, text: `test verse ${n}` })
function pending<T>() { let resolve!: (v:T)=>void, reject!: (e:Error)=>void; const promise=new Promise<T>((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject} }
const response = (text: string) => ({ ok:true,json:async()=>({ayah:{text}}) }) as Response
const bundled = (text: string) => ({ok:true,json:async()=>({'1':text})}) as Response
function open(h: ReturnType<typeof renderHook<ReturnType<typeof useQuranTafsir>, {surah:number}>>, n:number) { act(()=>h.result.current.openTafsir(ayah(n))) }
describe('tafsir selection ownership',()=>{
 beforeEach(()=>{localStorage.clear();localStorage.setItem('azkar_tafsir_source','saddi');vi.stubGlobal('fetch',vi.fn())})
 it('ignores reversed network responses even if transport ignores abort',async()=>{
  const a=pending<Response>(),b=pending<Response>();vi.mocked(fetch).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)
  const h=renderHook(()=>useQuranTafsir(2));act(()=>h.result.current.openTafsir(ayah(1)));act(()=>h.result.current.openTafsir(ayah(2)))
  await act(async()=>b.resolve(response('current')));expect(h.result.current.tafsirText).toBe('current')
  await act(async()=>a.resolve(response('stale')));expect(h.result.current.tafsirText).toBe('current');expect(h.result.current.tafsirFor?.numberInSurah).toBe(2)
 })
 it('clears loading for a cache hit while old request is pending',async()=>{
  const a=pending<Response>();vi.mocked(fetch).mockReturnValueOnce(a.promise);localStorage.setItem('azkar_tafsir_al-saddi_2:2','cached current')
  const h=renderHook(()=>useQuranTafsir(2));act(()=>h.result.current.openTafsir(ayah(1)));act(()=>h.result.current.openTafsir(ayah(2)))
  expect(h.result.current.tafsirLoading).toBe(false);expect(h.result.current.tafsirText).toBe('cached current')
  await act(async()=>a.resolve(response('stale')));expect(h.result.current.tafsirText).toBe('cached current')
 })
 it('does not show a stale failure or clear the current loading state',async()=>{
  const a=pending<Response>(),b=pending<Response>();vi.mocked(fetch).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)
  const h=renderHook(()=>useQuranTafsir(2));act(()=>h.result.current.openTafsir(ayah(1)));act(()=>h.result.current.openTafsir(ayah(2)))
  await act(async()=>a.reject(new Error('old failed')));expect(h.result.current.tafsirLoading).toBe(true);expect(h.result.current.tafsirError).toBe(false)
  await act(async()=>b.resolve(response('current')));expect(h.result.current.tafsirText).toBe('current')
 })
 it('shows a current failure and recovers on reopen',async()=>{
  vi.mocked(fetch).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response('recovered'))
  const h=renderHook(()=>useQuranTafsir(2));act(()=>h.result.current.openTafsir(ayah(1)));await waitFor(()=>expect(h.result.current.tafsirError).toBe(true));expect(h.result.current.tafsirLoading).toBe(false)
  act(()=>h.result.current.openTafsir(ayah(1)));await waitFor(()=>expect(h.result.current.tafsirText).toBe('recovered'));expect(h.result.current.tafsirError).toBe(false)
 })
 it('invalidates on close and aborts the current request',async()=>{
  const a=pending<Response>();vi.mocked(fetch).mockReturnValueOnce(a.promise);const h=renderHook(()=>useQuranTafsir(2));act(()=>h.result.current.openTafsir(ayah(1)))
  const signal=vi.mocked(fetch).mock.calls[0][1]?.signal;act(()=>h.result.current.closeTafsir());expect(signal?.aborted).toBe(true)
  await act(async()=>a.resolve(response('stale')));expect(h.result.current.tafsirFor).toBeNull();expect(h.result.current.tafsirText).toBeNull()
 })
 it('invalidates on unmount',async()=>{
  const a=pending<Response>();vi.mocked(fetch).mockReturnValueOnce(a.promise);const h=renderHook(()=>useQuranTafsir(2));act(()=>h.result.current.openTafsir(ayah(1)));const signal=vi.mocked(fetch).mock.calls[0][1]?.signal
  h.unmount();expect(signal?.aborted).toBe(true);await act(async()=>a.resolve(response('stale')));expect(localStorage.getItem('azkar_tafsir_al-saddi_2:1')).toBeNull()
 })
 it('does not carry a result into another surah',async()=>{
  const a=pending<Response>();vi.mocked(fetch).mockReturnValueOnce(a.promise);const h=renderHook(({surah})=>useQuranTafsir(surah),{initialProps:{surah:2}});open(h,1);h.rerender({surah:3})
  expect(h.result.current.tafsirFor).toBeNull();await act(async()=>a.resolve(response('stale')));expect(h.result.current.tafsirText).toBeNull()
 })
 it('invalidates on source change and freezes the label to the new selection',async()=>{
  const a=pending<Response>();vi.mocked(fetch).mockReturnValueOnce(a.promise).mockResolvedValueOnce(response('new source'));const h=renderHook(()=>useQuranTafsir(2));act(()=>h.result.current.openTafsir(ayah(1)))
  act(()=>{localStorage.setItem('azkar_tafsir_source','tabari');emitSettingsChanged()});expect(h.result.current.tafsirFor).toBeNull();act(()=>h.result.current.openTafsir(ayah(1)))
  await waitFor(()=>expect(h.result.current.tafsirText).toBe('new source'));await act(async()=>a.resolve(response('stale')));expect(h.result.current.tafsirText).toBe('new source');expect(h.result.current.tafsirLabel).toBe('تفسير الطبري')
 })
 it('guards bundled responses and does not launch an obsolete online fallback',async()=>{
  localStorage.setItem('azkar_tafsir_source','muyassar');const a=pending<Response>();vi.mocked(fetch).mockReturnValueOnce(a.promise);localStorage.setItem('azkar_tafsir_muyassar_2:2','current cache')
  const h=renderHook(()=>useQuranTafsir(2));act(()=>h.result.current.openTafsir(ayah(1)));act(()=>h.result.current.openTafsir(ayah(2)));await act(async()=>a.resolve({ok:false} as Response))
  expect(h.result.current.tafsirText).toBe('current cache');expect(fetch).toHaveBeenCalledTimes(1)
 })
 it('guards the async response body after headers have arrived',async()=>{
  const body=pending<unknown>();vi.mocked(fetch).mockResolvedValueOnce({ok:true,json:()=>body.promise} as Response);const h=renderHook(()=>useQuranTafsir(2));act(()=>h.result.current.openTafsir(ayah(1)));await act(async()=>{})
  localStorage.setItem('azkar_tafsir_al-saddi_2:2','cache');act(()=>h.result.current.openTafsir(ayah(2)));await act(async()=>body.resolve({ayah:{text:'old body'}}));expect(h.result.current.tafsirText).toBe('cache')
 })
 it('uses bundled tafsir offline',async()=>{
  localStorage.setItem('azkar_tafsir_source','muyassar');vi.mocked(fetch).mockResolvedValueOnce(bundled('bundled'));const h=renderHook(()=>useQuranTafsir(2));act(()=>h.result.current.openTafsir(ayah(1)));await waitFor(()=>expect(h.result.current.tafsirText).toBe('bundled'));expect(fetch).toHaveBeenCalledTimes(1)
 })
 it('rejects a response identifying another verse or surah',async()=>{
  vi.mocked(fetch).mockResolvedValueOnce({ok:true,json:async()=>({surah:{number:3},ayah:{ayah:1,text:'wrong'}})} as Response);const h=renderHook(()=>useQuranTafsir(2));act(()=>h.result.current.openTafsir(ayah(1)));await waitFor(()=>expect(h.result.current.tafsirError).toBe(true));expect(h.result.current.tafsirText).toBeNull()
 })
})

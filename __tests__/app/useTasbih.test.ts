import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTasbih } from '../../src/app/features/tasbih/useTasbih'
import { todayKey } from '../../src/app/constants'
import { getTasbihWords } from '../../src/app/constants'

describe('useTasbih', () => {
 beforeEach(()=>{localStorage.clear();vi.restoreAllMocks()})
 afterEach(()=>{vi.useRealTimers()})
 it('loads stable-id counts and today total',()=>{const today=todayKey();localStorage.setItem('azkar_counts',JSON.stringify({subhanallah:4}));localStorage.setItem('azkar_day_total','9');localStorage.setItem('azkar_day_total_date',today);const {result}=renderHook(()=>useTasbih());act(()=>result.current.load());expect(result.current.counts.subhanallah).toBe(4);expect(result.current.dayTotal).toBe(9)})
 it('isolates corrupted counts and keeps a valid day total',()=>{localStorage.setItem('azkar_counts','{bad-json');localStorage.setItem('azkar_day_total','12');localStorage.setItem('azkar_day_total_date',todayKey());const {result}=renderHook(()=>useTasbih());act(()=>result.current.load());expect(result.current.counts).toEqual({subhanallah:0,alhamdulillah:0,allahuakbar:0});expect(result.current.dayTotal).toBe(12)})
 it('resets stale daily total without deleting cumulative counts',()=>{localStorage.setItem('azkar_counts',JSON.stringify({alhamdulillah:7}));localStorage.setItem('azkar_day_total','99');localStorage.setItem('azkar_day_total_date','2000-01-01');const {result}=renderHook(()=>useTasbih());act(()=>result.current.load());expect(result.current.dayTotal).toBe(0);expect(result.current.counts.alhamdulillah).toBe(7)})
 it('rolls the day over when tapping after midnight',()=>{localStorage.setItem('azkar_day_total','20');localStorage.setItem('azkar_day_total_date','2000-01-01');const {result}=renderHook(()=>useTasbih());act(()=>result.current.load());act(()=>result.current.tap('subhanallah'));expect(result.current.dayTotal).toBe(1);expect(result.current.counts.subhanallah).toBe(1)})
 it('completes a round and increments rounds',()=>{const {result}=renderHook(()=>useTasbih());act(()=>result.current.load());act(()=>{for(let i=0;i<33;i++)result.current.tap('subhanallah')});expect(result.current.roundCounts.subhanallah).toBe(0);expect(result.current.rounds.subhanallah).toBe(1);expect(result.current.counts.subhanallah).toBe(33)})
 it('persists after the debounce window',()=>{vi.useFakeTimers();const {result}=renderHook(()=>useTasbih());act(()=>result.current.tap('subhanallah'));expect(localStorage.getItem('azkar_counts')).toBeNull();act(()=>vi.advanceTimersByTime(300));expect(JSON.parse(localStorage.getItem('azkar_counts')!)).toEqual({subhanallah:1,alhamdulillah:0,allahuakbar:0})})
 it('supports custom phrase goals from localStorage',()=>{localStorage.setItem('azkar_custom_tasbih_list',JSON.stringify([{id:'custom-x',word:'لا إله إلا الله',goal:100}])) ;const words=getTasbihWords();expect(words.find(w=>w.id==='custom-x')).toEqual({id:'custom-x',word:'لا إله إلا الله',goal:100})})
 it('preserves counts for removed custom phrase ids during migration',()=>{localStorage.setItem('azkar_counts',JSON.stringify({subhanallah:2,'custom-old':17}));const {result}=renderHook(()=>useTasbih());act(()=>result.current.load());expect(result.current.counts['custom-old']).toBe(17)})
 it('resets only the current round',()=>{const {result}=renderHook(()=>useTasbih());act(()=>result.current.tap('subhanallah'));act(()=>result.current.tap('alhamdulillah'));act(()=>result.current.resetWord('subhanallah'));expect(result.current.roundCounts.subhanallah).toBe(0);expect(result.current.roundCounts.alhamdulillah).toBe(1);expect(result.current.dayTotal).toBe(2)})
})

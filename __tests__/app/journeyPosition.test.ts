import { beforeEach,describe,expect,it } from 'vitest'
import { clearJourneyPosition,readJourneyPosition,saveJourneyPosition } from '../../src/app/features/azkar/journeyPosition'

beforeEach(()=>localStorage.clear())

describe('journeyPosition',()=>{
 it('reads a saved category position',()=>{localStorage.setItem('azkar_journey_position',JSON.stringify({'cat-a':1}));expect(readJourneyPosition('cat-a')).toBe(1)})
 it('saves a category position without removing other categories',()=>{localStorage.setItem('azkar_journey_position',JSON.stringify({'cat-a':1}));saveJourneyPosition('cat-b',2);expect(JSON.parse(localStorage.getItem('azkar_journey_position')!)).toEqual({'cat-a':1,'cat-b':2})})
 it('clears only the requested category position',()=>{localStorage.setItem('azkar_journey_position',JSON.stringify({'cat-a':1,'cat-b':2}));clearJourneyPosition('cat-a');expect(JSON.parse(localStorage.getItem('azkar_journey_position')!)).toEqual({'cat-b':2})})
 it.each([
  ['missing category',JSON.stringify({'cat-a':1}),'cat-b'],
  ['negative value',JSON.stringify({'cat-a':-1}),'cat-a'],
  ['string value',JSON.stringify({'cat-a':'1'}),'cat-a'],
  ['malformed JSON','{','cat-a'],
 ])('returns null for invalid stored value (%s)',(_,stored,categoryId)=>{localStorage.setItem('azkar_journey_position',stored);expect(readJourneyPosition(categoryId)).toBeNull()})
})

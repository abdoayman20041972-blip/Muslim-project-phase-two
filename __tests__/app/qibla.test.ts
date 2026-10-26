import { describe, expect, it } from 'vitest'
import { angularDiff, dialLabelAngle, qiblaBearing } from '../../src/app/features/prayer/QiblaCompass'
describe('Qibla bearing',()=>{
 it('matches Cairo reference approximately',()=>expect(qiblaBearing(30.04442,31.235712)).toBeCloseTo(136.14,1))
 it('matches London reference approximately',()=>expect(qiblaBearing(51.507351,-0.127758)).toBeCloseTo(118.99,1))
 it('matches New York reference approximately',()=>expect(qiblaBearing(40.712776,-74.005974)).toBeCloseTo(58.48,1))
})

describe('Qibla angle normalization',()=>{
 it('handles 359° to 1° as a 2° difference',()=>expect(angularDiff(1,359)).toBe(2))
 it('handles values outside one full turn',()=>expect(angularDiff(721,1)).toBe(0))
})

describe('Qibla dial label angles',()=>{
 it('keeps cardinal angles unchanged when heading is null',()=>{
  expect(dialLabelAngle(0,null)).toBe(0)
  expect(dialLabelAngle(90,null)).toBe(90)
  expect(dialLabelAngle(180,null)).toBe(180)
  expect(dialLabelAngle(270,null)).toBe(270)
 })
 it('rotates north and east for a 90° heading',()=>{
  expect(dialLabelAngle(0,90)).toBe(-90)
  expect(dialLabelAngle(90,90)).toBe(0)
 })
 it('rotates north and south for a 180° heading',()=>{
  expect(dialLabelAngle(0,180)).toBe(-180)
  expect(dialLabelAngle(180,180)).toBe(0)
 })
 it('matches the null-heading angles when heading is 0°',()=>{
  expect(dialLabelAngle(0,0)).toBe(dialLabelAngle(0,null))
  expect(dialLabelAngle(90,0)).toBe(dialLabelAngle(90,null))
  expect(dialLabelAngle(180,0)).toBe(dialLabelAngle(180,null))
  expect(dialLabelAngle(270,0)).toBe(dialLabelAngle(270,null))
 })
})

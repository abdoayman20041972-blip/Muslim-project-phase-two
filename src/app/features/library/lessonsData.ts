/**
 * Seerah lessons: the 24 episodes of Dr. Tariq Al-Suwaidan's series on his YouTube channel. The channel is the owner of the
 * playlist and is linked from suwaidan.com (research check, 25 Nov 2026). The app only links out to YouTube: no download, no re-hosting,
 * and in-app playback is NOT offered because embed playback was never confirmed.
 */
export const LESSON_SERIES = {
  title: 'السيرة النبوية',
  teacher: 'د. طارق السويدان',
  playlistUrl: 'https://www.youtube.com/playlist?list=PLATlJNRzYr-C4scyewXpY0gQJ2nMB3Wbt',
  channelUrl: 'https://www.youtube.com/@DrAlSuwaidan',
}
export const LESSON_EPISODES: { n: number; id: string; sec: number }[] = [{"n": 1, "id": "PzVUqMYsfro", "sec": 4365}, {"n": 2, "id": "QqeNhIBv2IE", "sec": 4444}, {"n": 3, "id": "Grg00H7JH4E", "sec": 4393}, {"n": 4, "id": "d_3emteBaeY", "sec": 4549}, {"n": 5, "id": "VKKdipTSUDE", "sec": 4653}, {"n": 6, "id": "6iXmxYsrZV4", "sec": 4576}, {"n": 7, "id": "Oqrnfp-R2AQ", "sec": 4676}, {"n": 8, "id": "-N5gc5fO8uo", "sec": 4630}, {"n": 9, "id": "sWCoY6Jtap8", "sec": 4695}, {"n": 10, "id": "4mY0nbKgnA8", "sec": 4349}, {"n": 11, "id": "wdQMu5uJYUM", "sec": 4360}, {"n": 12, "id": "EsWsAeD6Qus", "sec": 3844}, {"n": 13, "id": "flrqeaTnwPc", "sec": 4443}, {"n": 14, "id": "NGLD9anozP4", "sec": 4495}, {"n": 15, "id": "RiMnytcFnjU", "sec": 4166}, {"n": 16, "id": "a4BsyM00D8I", "sec": 4406}, {"n": 17, "id": "tMPqcSjsTKc", "sec": 4317}, {"n": 18, "id": "TtTF3gIfxCY", "sec": 3947}, {"n": 19, "id": "LGi89bSvMhA", "sec": 4658}, {"n": 20, "id": "VLHxTpmDvvk", "sec": 4686}, {"n": 21, "id": "qZ7HpSbtZW4", "sec": 4721}, {"n": 22, "id": "Ia9Ba-5zuJM", "sec": 4690}, {"n": 23, "id": "TyIm7OGzRho", "sec": 4351}, {"n": 24, "id": "CzA8cKBdUrg", "sec": 4371}]
export const lessonWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`

import card1 from './1.png'
import card2 from './2.png'
import card3 from './3.png'
import card4 from './4.png'
import card5 from './5.png'
import card6 from './6.png'
import card7 from './7.png'
import card8 from './8.png'
import card9 from './9.png'

export const getCard = (baycId: number, doodlesId: number) => {
  if (baycId === 3650) {
    if (doodlesId === 4889) return card1
    if (doodlesId === 3701) return card2
    if (doodlesId === 2952) return card3
  }

  if (baycId === 4671) {
    if (doodlesId === 4889) return card4
    if (doodlesId === 3701) return card5
    if (doodlesId === 2952) return card6
  }

  if (baycId === 3368) {
    if (doodlesId === 4889) return card7
    if (doodlesId === 3701) return card8
    if (doodlesId === 2952) return card9
  }
}

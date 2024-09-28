export interface Items {
    head: Slot[],
    neck: Slot[],
    shoulder: Slot[],
    back: Slot[],
    chest: Slot[],
    wrist: Slot[],
    hands: Slot[],
    waist: Slot[],
    legs: Slot[],
    feet: Slot[],
    finger: Slot[],
    trinket: Slot[],
    main_hand: Slot[],
    off_hand: Slot[],
}

export interface Slot {
    id: number,
    armor: string,
    tier?: number,
    exactID?: number[];
    boss: number,
    sim: SimC[]
}

export interface SimC {
    name: string,
    spec: string,
    dps: number
}

export interface ItemsLibrary {
    id: number,
    name: string,
    icon: string,
    boss: number,
    stats: Stats[]
}

export interface Stats {
    id: number,
    alloc: number
}

export interface Boss {
    id: number,
    name: string,
}
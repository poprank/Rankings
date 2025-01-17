import { TraitCategory, TraitInit } from '@poprank/sdk';
import keccak256 from 'keccak256';

export const TRAIT_COUNT = 'Trait Count';
export const ID_TRAIT_TYPE = 'ID';
export const NONE_TRAIT = 'None';

export const ensCollectionSlugs = ['ens', '999club', '100kclub'] as const;
export type EnsCollectionSlug = typeof ensCollectionSlugs[number];
export const ensCollectionSizes: Record<EnsCollectionSlug, number> = {
    '999club': 1_000,
    'ens': 10_000,
    '100kclub': 100_000,
};

export const DAYS_IN_MONTH: { [k: number]: number; } = {
    1: 31,
    2: 29, // 28 in a common year and 29 in a leap year and we're only concerned with max days here
    3: 31,
    4: 30,
    5: 31,
    6: 30,
    7: 31,
    8: 31,
    9: 30,
    10: 31,
    11: 30,
    12: 31,
};

const hexToDec = (s: string) => {
    let i, j, carry;
    const digits = [0];
    for (i = 0; i < s.length; i += 1) {
        carry = parseInt(s.charAt(i), 16);
        for (j = 0; j < digits.length; j += 1) {
            digits[j] = digits[j] * 16 + carry;
            carry = digits[j] / 10 | 0;
            digits[j] %= 10;
        }
        while (carry > 0) {
            digits.push(carry % 10);
            carry = carry / 10 | 0;
        }
    }
    return digits.reverse().join('');
};

export const stringToKeccak256DecimalId = (s: string, digits: number) =>
    hexToDec(keccak256(`0000${s}`.slice(-digits)).toString('hex'));

const isEven = (x: number) => x % 2 === 0;

const ensMetaFunc = (nftTraits: TraitInit[], collection: EnsCollectionSlug) => {
    // Early exit
    const trait = nftTraits.find(t => t.displayType === 'number' && t.typeValue === ID_TRAIT_TYPE);
    if (!trait)
        throw new Error(`This trait needs a trait with a displayType of 'number' and a typeValue of ${ID_TRAIT_TYPE}`);

    // Needed vars
    const max = ensCollectionSizes[collection as EnsCollectionSlug];
    const digits = max.toString().length - 1;
    const id = +trait.value;
    const stringifiedId = `000${id}`.slice(-digits);
    const isEvenDigits = isEven(digits);
    const outTraits: TraitInit[] = [];

    const baseOutTrait: Omit<TraitInit, 'value'> = {
        category: 'Meta',
        typeValue: 'Special',
        displayType: null,
    };

    // Palindrome (ABA, ABBA, ABABA, AABAA) trait
    let isPalindrome = true;
    let a = 0;
    let b = stringifiedId.length - 1;
    while (a < b) {
        if (stringifiedId[a] !== stringifiedId[b]) {
            isPalindrome = false;
            break;
        }
        a++;
        b--;
    }
    if (isPalindrome) {
        outTraits.push({ ...baseOutTrait, value: 'Palindrome' });
    }

    // Prime trait
    let isPrime = !(['0', '2', '4', '5', '6', '8'].includes(stringifiedId[digits - 1]) && id !== 2 && id !== 5);
    let c = 2;
    while (c <= Math.ceil(Math.sqrt(id)) && isPrime) {
        if (id % c === 0) {
            isPrime = false;
        }

        c++;
    }
    if (isPrime) {
        outTraits.push({ ...baseOutTrait, value: 'Prime' });
    }

    // Fibonacci trait
    const isFibonacci = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025].includes(id);
    if (isFibonacci) {
        outTraits.push({ ...baseOutTrait, value: 'Fibonacci' });
    }

    // Alternating trait
    let isAlternating = false;
    if (isEvenDigits) {
        // Even - Check for ABAB
        isAlternating = stringifiedId.slice(0, 2) === stringifiedId.slice(2);
    } else {
        // Odd - Check for ABA or ABABA
        isAlternating = isPalindrome && stringifiedId[0] !== stringifiedId[1];
    }
    if (isAlternating) {
        outTraits.push({ ...baseOutTrait, value: 'Alternating' });
    }

    // Double (0331, 0013, 3122, etc) trait
    let isDouble = false;
    stringifiedId.split('').forEach((char, index) => {
        if (!index) return;
        if (stringifiedId[index - 1] === char) isDouble = true;
    });
    if (isDouble) {
        outTraits.push({ ...baseOutTrait, value: 'Double' });
    }

    // Double (3311, 03311, etc) Pair trait
    if (digits !== 3) {
        let isDoublePair = stringifiedId[0] === stringifiedId[1] && stringifiedId[2] === stringifiedId[3];
        if (digits === 5) {
            isDoublePair = stringifiedId[1] === stringifiedId[2] && stringifiedId[3] === stringifiedId[4];
        }
        if (isDoublePair) {
            outTraits.push({ ...baseOutTrait, value: 'Double Pair' });
        }
    }

    // Birthday trait
    let isBirthday = false;
    if (digits === 4) {
        const day = +stringifiedId.slice(0, 2);
        const month = +stringifiedId.slice(2, 4);
        isBirthday = month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month];
        if (isBirthday) {
            outTraits.push({ ...baseOutTrait, value: 'Birthday' });
        }
    }

    // Birthday (US) trait
    let isUSBirthday = false;
    if (digits === 4) {
        const usMonth = +stringifiedId.slice(0, 2);
        const usDay = +stringifiedId.slice(2, 4);
        isUSBirthday = usMonth >= 1 && usMonth <= 12 && usDay >= 1 && usDay <= DAYS_IN_MONTH[usMonth];
        if (isUSBirthday) {
            outTraits.push({ ...baseOutTrait, value: 'Birthday (US)' });
        }
    }

    // Birthday (Global) trait
    if (isBirthday && isUSBirthday) {
        outTraits.push({ ...baseOutTrait, value: 'Birthday (Global)' });
    }

    // Triple (333, 3331, 33311, etc) trait
    let isTriple = false;
    for (let i = 0; i <= stringifiedId.length - 3; i++) {
        if (['000', '111', '222', '333', '444', '555', '666', '777', '888', '999'].includes(stringifiedId.slice(i, i + 3)))
            isTriple = true;
    }
    if (isTriple) {
        outTraits.push({ ...baseOutTrait, value: 'Triple' });
    }

    // Quadruple (3333, 33331, etc) trait
    if (digits !== 3) {
        let isQuadruple = false;
        for (let i = 0; i <= stringifiedId.length - 4; i++) {
            if (['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'].includes(stringifiedId.slice(i, i + 4)))
                isQuadruple = true;
        }
        if (isQuadruple) {
            outTraits.push({ ...baseOutTrait, value: 'Quadruple' });
        }
    }

    // Quintuple (33333, 44444, etc.) trait
    if (digits === 5) {
        let isQuintuple = false;
        if (['00000', '11111', '22222', '33333', '44444', '55555', '66666', '77777', '88888', '99999'].includes(stringifiedId)) {
            isQuintuple = true;
        }
        if (isQuintuple) {
            outTraits.push({ ...baseOutTrait, value: 'Quintuple' });
        }
    }

    // Hundred (x00), Thousand (x000), Ten Thousand (x0,000) trait
    if (id % Math.pow(10, digits - 1) === 0) {
        const values: Record<number, string> = {
            3: 'Hundred',
            4: 'Thousand',
            5: 'Ten Thousand',
        };

        outTraits.push({ ...baseOutTrait, value: values[digits] });
    }

    // Square number
    const isSquare = id > 0 && Number.isInteger(Math.sqrt(id));
    if (isSquare) {
        outTraits.push({ ...baseOutTrait, value: 'Square (^2)' });
    }

    // Cube number
    const isCube = id > 0 && Number.isInteger(Math.cbrt(id));
    if (isCube) {
        outTraits.push({ ...baseOutTrait, value: 'Cube (^3)' });
    }

    // Was the ENS registered before the punk mint date
    // In future will attempt to look at first mint date instead
    const registrationDate = nftTraits.find(t => t.typeValue === 'Registration Date');
    const isPrePunk = registrationDate && (new Date(+registrationDate.value * 1000)) < new Date('2017-06-23T00:00:00.000Z');
    if (isPrePunk) {
        outTraits.push({ ...baseOutTrait, value: 'Pre Punk' });
    }

    return outTraits;
};

/**
 * All the manual functions we use to add custom "meta" traits to collections.
 * These meta traits don't affect rarity at all; they just make for more meaningful
 * trait filters on the frontend.
 */
export const customMetaFunctions: Record<string, (nftTraits: TraitInit[]) => TraitInit[]> = {
    'creatureworld': nftTraits => {
        const outTraits: TraitInit[] = [];
        const bg = nftTraits.find(t => t.typeValue === 'Background');
        const creature = nftTraits.find(t => t.typeValue === 'Creature');
        if (bg && creature) {
            if (bg.value === creature.value) {
                outTraits.push({
                    typeValue: 'Creature Background Match',
                    value: 'true',
                    category: 'Meta',
                    displayType: null,
                });
            }
        }
        return outTraits;
    },
    'deathbats-club': nftTraits => {
        const outTraits: TraitInit[] = [];
        nftTraits.forEach(trait => {
            const tType = trait.typeValue;
            if (['Brooks Wackerman', 'Johnny Christ', 'M. Shadows', 'Synyster Gates', 'Zacky Vengence', 'Zacky Vengeance', 'Shadows'].includes(tType) && !Object.keys(outTraits).includes('1 of 1')) {
                outTraits.push({
                    typeValue: '1 of 1',
                    value: tType,
                    category: 'Meta',
                    displayType: null,
                });
            }
        });
        return outTraits;
    },
    'mutant-ape-yacht-club': nftTraits => {
        const outTraits: TraitInit[] = [];
        const firstTrait = nftTraits[0].value;
        const baseTrait = {
            typeValue: 'Mutant Type',
            id: '',
            rarityTraitSum: 0,
            traitCount: 0,
            category: 'Meta' as TraitCategory,
            displayType: null,
        };

        if (firstTrait.includes('M1')) {
            outTraits.push({
                ...baseTrait,
                value: 'M1',

            });
        } else if (firstTrait.includes('M2')) {
            outTraits.push({
                ...baseTrait,
                value: 'M2',
            });
        } else {
            outTraits.push({
                ...baseTrait,
                value: 'M3',
            });
        }
        return outTraits;
    },
    'ens': (nftTraits) => ensMetaFunc(nftTraits, 'ens'),
    '999club': (nftTraits) => ensMetaFunc(nftTraits, '999club'),
    '100kclub': (nftTraits) => ensMetaFunc(nftTraits, '100kclub'),
    'goblintownwtf': (nftTraits) => {
        const outTraits: TraitInit[] = [];
        const lazerCount = nftTraits.filter(t =>
            t.typeValue === 'MUNCHYHOLE' && t.value === 'LAZERBARRF' ||
            t.typeValue === 'stankfinder' && t.value === 'LAAAYZERSNOT' ||
            t.typeValue === 'Eye on dat side' && t.value === 'LAZZARZZZZ' ||
            t.typeValue === 'Eyz on dis side' && t.value === 'LAZERRR' ||
            t.typeValue === 'Eers' && t.value === 'LAAAAAZZER EERS',
        ).length;

        if (lazerCount) {
            outTraits.push({
                typeValue: '# LAZERS',
                value: `${lazerCount}`,
                category: 'Meta' as TraitCategory,
                displayType: null,
            });
        }
        return outTraits;
    },
};

/**
 * Get the "match" traits for a collection. Has some collection-specific logic to add desired
 * filters.
 * @param nftTraits
 * @param collection
 * @returns
 */
export const getNftTraitsMatches = (nftTraits: TraitInit[], collection: string): Record<string, number> => {
    const traitValueMatches: Record<string, number> = {};
    nftTraits.forEach((n: TraitInit) => {
        let scrubbedValue = `${n.value}`;

        // Ignore all "None" traits
        if (scrubbedValue === NONE_TRAIT) return;

        // Remove the first word from the trait, as it's always "M1/M2/M3"
        if (collection === 'mutant-ape-yacht-club')
            scrubbedValue = scrubbedValue.split(' ').slice(1).join(' ');

        // Attempt to match "Skin - Blue" and "Shirt - Light Blue"
        if (collection === 'doodles-official') {
            scrubbedValue = scrubbedValue.toLowerCase().replace('light ', '');
        }

        // Grab the first word of the trait type. This is to try match "Blue Shirt" and "Blue Hat".
        // Will likely make this more intelligent in the future, this is just a simple implementation
        scrubbedValue = scrubbedValue.split(' ')[0].toLowerCase();

        if (!traitValueMatches[scrubbedValue]) {
            traitValueMatches[scrubbedValue] = 0;

            // For Creature World, if an NFT is a "thermal", it has two, not just one, trait signifying that
            if (collection === 'creatureworld' && ['thermal', 'clouds'].includes(scrubbedValue))
                return;
        }

        traitValueMatches[scrubbedValue]++;
    });

    return traitValueMatches;
};

// Type definitions for lang

/** A match: where it is in the string and what it matched. */
export interface Match {
    index: number;
    value: string;
}

/** A bracketed section, index -1 when there is none. */
export interface Section extends Match {
    start?: Match;
    end?: Match;
}

/** Anything String.prototype.replace accepts as its second argument. */
export type Replacement = string | ((substring: string, ...args: any[]) => string);

/** A tokenize rule: a regex, or a start/end pair for a nested section. */
export type TokenRule =
    | { type: string; match: RegExp }
    | { type: string; start: RegExp; end: RegExp; ignore?: RegExp };

export interface Token {
    type: string;
    value: string;
    index: number;
}

export interface TokenizeOptions {
    /** Text to drop between tokens; whitespace by default, null for none. */
    skip?: RegExp | null;
}

/** Split `string` by `regex`, never inside a match of `ignore`. */
export function split(string: string, regex: RegExp, ignore?: RegExp): string[];

/** Split `string` by `regex`, never inside a `start`…`end` section or a match of `ignore`. */
export function split_delims(string: string, regex: RegExp, start: RegExp, end: RegExp, ignore?: RegExp): string[];

/** Replace matches of `regex` (all if global, else the first), never inside a match of `ignore`. */
export function replace(string: string, regex: RegExp, replacement: Replacement, ignore?: RegExp): string;

/** Replace matches of `regex`, never inside a `start`…`end` section or a match of `ignore`. */
export function replace_delims(string: string, regex: RegExp, replacement: Replacement, start: RegExp, end: RegExp, ignore?: RegExp): string;

/** The first `start`…`end` section, nested to any depth; index -1 if the brackets do not balance. */
export function matchSection(string: string, start: RegExp, end: RegExp, ignore?: RegExp): Section;

/** The first match of `regex`, index -1 if none. */
export function match(string: string, regex: RegExp | null | undefined): Match;

/** Every non-overlapping, non-empty match of `regex`. */
export function matches(string: string, regex: RegExp | null | undefined): Match[];

/** Cut `string` into tokens using `rules`, tried in order at each position. */
export function tokenize(string: string, rules: TokenRule[], opts?: TokenizeOptions): Token[];

/** Rewrite each match's value from `string` using its index and length. */
export function conform_matches_string(matches: Match[], string: string): Match[];

// scripts/lang.js as a plain <script> puts the same functions on window
declare global {
    function split(string: string, regex: RegExp, ignore?: RegExp): string[];
    function split_delims(string: string, regex: RegExp, start: RegExp, end: RegExp, ignore?: RegExp): string[];
    function replace(string: string, regex: RegExp, replacement: Replacement, ignore?: RegExp): string;
    function replace_delims(string: string, regex: RegExp, replacement: Replacement, start: RegExp, end: RegExp, ignore?: RegExp): string;
    function matchSection(string: string, start: RegExp, end: RegExp, ignore?: RegExp): Section;
    function match(string: string, regex: RegExp | null | undefined): Match;
    function matches(string: string, regex: RegExp | null | undefined): Match[];
    function tokenize(string: string, rules: TokenRule[], opts?: TokenizeOptions): Token[];
    function conform_matches_string(matches: Match[], string: string): Match[];
}

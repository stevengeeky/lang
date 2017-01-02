# lang

An extension of regex which makes it easy to match, replace, and split complex expressions like strings with escape characters and embedded brackets, match around these types of expressions, or delimit these types of expressions with other complex expressions.

## Examples

*Split a string 'string' by a regex 'regex' while ignoring delimiters created by the regex 'ignore'*

`split(string, regex, ignore)`

*Split a string 'string' by a regex 'regex' while ignoring delimiters created by the regex 'ignore' while also ignoring embedded delimiters created by the start token 'start' and end token 'end'*

`split_delims(string, regex, start, end, ignore)`

*Replace all matches of a regex 'regex' in a string 'string' with a string 'replacement' while ignoring delimiters created by the regex 'ignore'*

`replace(string, regex, replacement, ignore)`

*Replace all matches of a regex 'regex' in a string 'string' with a string 'replacement' while ignoring recursive delimiters defined by the start pattern 'start' and end pattern 'end' while also ignoring non-recursive delimiters created by the regex 'ignore'*

`replace_delims(string, regex, replacement, start, end, ignore)`

*Match a section of a string 'string' with a start pattern 'start' and end pattern 'end' while ignoring non-recursive delimiters created by the regex 'ignore'*

`matchSection(string, start, end, ignore)`

*A JavaScript Project by Steven O'Riley*

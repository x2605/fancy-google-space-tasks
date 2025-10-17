// pastableSnippets.ts - Temporary code blocks for development
/** 
 * This code never runs by itself.
*/

// for typechecking
const snippetMode = null;
            
            /* - TEMPORARY BREAK POINT START - */
            if (snippetMode) {
                // @ts-ignore
                await new Promise<void>(r => Object.assign(window, { resume: r }));
            }
            /* - TEMPORARY BREAK POINT END --- */
/**
 * Generates a meaningful chat title from the first message
 * @param {string} message - The first message in the chat
 * @returns {string} - A concise title (4-6 words max)
 */
export const generateChatTitle = (message) => {
    if (!message || typeof message !== 'string') {
        return 'New Chat';
    }

    // Clean the message
    let cleanMessage = message.trim().toLowerCase();

    // Remove common question starters and unnecessary words
    const removeWords = [
        'please', 'tell me', 'i want', 'i need', 'can you', 'could you',
        'would you', 'how do i', 'what is', 'what are', 'explain', 'help me',
        'i would like', 'i am looking for', 'can you help', 'i need help',
        'i want to know', 'i want to learn', 'i want to understand',
        'show me', 'give me', 'i need to know', 'i need help with',
        'i am trying to', 'i am working on', 'i am studying',
        'i am learning', 'i am confused about', 'i don\'t understand',
        'i have a question about', 'i have a problem with',
        'i am having trouble with', 'i am stuck on'
    ];

    // Remove these words from the beginning
    for (const word of removeWords) {
        if (cleanMessage.startsWith(word)) {
            cleanMessage = cleanMessage.substring(word.length).trim();
            break;
        }
    }

    // Remove question marks and other punctuation at the end
    cleanMessage = cleanMessage.replace(/[?!.]$/, '').trim();

    // Split into words
    const words = cleanMessage.split(/\s+/).filter(word => word.length > 0);

    // If message is too short, return as is
    if (words.length <= 2) {
        return capitalizeWords(words.join(' '));
    }

    // Extract key terms (nouns, important words)
    const keyTerms = extractKeyTerms(words);

    // Generate title based on content type
    let title = '';

    if (isQuestion(message)) {
        // For questions, convert to statement
        title = generateStatementTitle(keyTerms, words);
    } else {
        // For statements, use key terms
        title = generateKeyTermsTitle(keyTerms);
    }

    // Ensure title is 4-6 words max
    const titleWords = title.split(' ');
    if (titleWords.length > 6) {
        title = titleWords.slice(0, 6).join(' ');
    }

    return title || 'New Chat';
};

/**
 * Extracts key terms from the message
 */
const extractKeyTerms = (words) => {
    const keyTerms = [];

    // Common important words to prioritize
    const importantWords = [
        'algorithm', 'programming', 'code', 'function', 'variable', 'class', 'method',
        'database', 'sql', 'api', 'framework', 'library', 'tool', 'software',
        'machine learning', 'ai', 'artificial intelligence', 'neural network',
        'react', 'javascript', 'python', 'java', 'html', 'css', 'node',
        'deployment', 'server', 'cloud', 'aws', 'azure', 'docker', 'kubernetes',
        'math', 'mathematics', 'physics', 'chemistry', 'biology', 'science',
        'law', 'theory', 'principle', 'concept', 'method', 'approach',
        'design', 'architecture', 'pattern', 'structure', 'system',
        'analysis', 'optimization', 'performance', 'security', 'testing'
    ];

    // Look for important words
    for (const word of words) {
        if (importantWords.some(important =>
            word.includes(important) || important.includes(word)
        )) {
            keyTerms.push(word);
        }
    }

    // If no important words found, use nouns and longer words
    if (keyTerms.length === 0) {
        for (const word of words) {
            if (word.length > 4 && !isCommonWord(word)) {
                keyTerms.push(word);
            }
        }
    }

    // If still no key terms, use first few words
    if (keyTerms.length === 0) {
        keyTerms.push(...words.slice(0, 3));
    }

    return keyTerms;
};

/**
 * Generates a statement title from key terms
 */
const generateStatementTitle = (keyTerms, allWords) => {
    if (keyTerms.length === 0) return 'New Chat';

    // Try to find the main subject
    const mainSubject = keyTerms[0];

    // Look for action words or context
    const actionWords = ['learn', 'understand', 'build', 'create', 'develop', 'implement', 'solve'];
    const contextWords = ['tutorial', 'guide', 'steps', 'process', 'method', 'approach'];

    for (const word of allWords) {
        if (actionWords.includes(word)) {
            return `${capitalizeWords(mainSubject)} ${capitalizeWords(word)}`;
        }
        if (contextWords.includes(word)) {
            return `${capitalizeWords(mainSubject)} ${capitalizeWords(word)}`;
        }
    }

    return capitalizeWords(mainSubject);
};

/**
 * Generates title from key terms
 */
const generateKeyTermsTitle = (keyTerms) => {
    if (keyTerms.length === 0) return 'New Chat';

    // Take first 2-3 key terms
    const titleTerms = keyTerms.slice(0, 3);
    return titleTerms.map(term => capitalizeWords(term)).join(' ');
};

/**
 * Checks if the message is a question
 */
const isQuestion = (message) => {
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'which', 'who'];
    const lowerMessage = message.toLowerCase();

    return questionWords.some(word => lowerMessage.startsWith(word)) ||
        message.includes('?') ||
        lowerMessage.startsWith('explain') ||
        lowerMessage.startsWith('tell me');
};

/**
 * Checks if a word is a common word
 */
const isCommonWord = (word) => {
    const commonWords = [
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
        'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ];
    return commonWords.includes(word.toLowerCase());
};

/**
 * Capitalizes words in a string
 */
const capitalizeWords = (str) => {
    if (!str) return '';

    return str.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

// Export for testing
export default generateChatTitle;



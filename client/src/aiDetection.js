import * as parser from "@babel/parser";

/**
 * AI Code Detection Engine
 * Uses a Hybrid Detection approach: AST Structural Pattern, Heuristics, and Statistical Signature Analysis.
 */

export const analyzeCodeForAI = async (code, language) => {
  const results = {
    score: 0,
    confidence: 0,
    indicators: [],
    level: "Low"
  };

  if (!code || code.trim().length < 50) return results;

  let heuristicScore = 0;
  let statisticalScore = 0;
  let astScore = 0;

  // 1. Heuristic Analysis
  const heuristics = analyzeHeuristics(code);
  heuristicScore = heuristics.score;
  results.indicators.push(...heuristics.indicators);

  // 2. Statistical Analysis
  const statistics = analyzeStatistics(code);
  statisticalScore = statistics.score;
  results.indicators.push(...statistics.indicators);

  // 3. AST Analysis (JavaScript/TypeScript only for now)
  if (language === 'javascript' || language === 'typescript') {
    try {
      const astResults = analyzeAST(code);
      astScore = astResults.score;
      results.indicators.push(...astResults.indicators);
    } catch (e) {
      // Fallback for non-JS or failed parse
      console.warn("AST Parsing failed, relying on heuristics/statistics", e);
    }
  } else {
    // For other languages, we boost heuristic weight since AST is missing
    heuristicScore *= 1.4;
    statisticalScore *= 1.2;
  }

  // Hybrid Scoring
  const rawScore = (heuristicScore * 0.4) + (statisticalScore * 0.3) + (astScore * 0.3);
  results.score = Math.min(Math.round(rawScore), 100);
  
  // Confidence calculation based on complexity and source data
  results.confidence = calculateConfidence(code, results.indicators.length);

  // Wording
  if (results.score > 70) {
    results.level = "Likely AI-assisted";
  } else if (results.score > 40) {
    results.level = "Suspicious AI patterns detected";
  } else {
    results.level = "Human-centric patterns";
  }

  return results;
};

const analyzeHeuristics = (code) => {
  let score = 0;
  const indicators = [];

  // Textbook-style comments
  const textbookComments = [
    /\/\/\s*Initialize/i,
    /\/\/\s*Define\s+the/i,
    /\/\/\s*Check\s+if/i,
    /\/\/\s*Loop\s+through/i,
    /\/\/\s*Return\s+the/i,
    /\/\/\s*This\s+function/i
  ];
  
  let matchCount = 0;
  textbookComments.forEach(regex => {
    if (regex.test(code)) matchCount++;
  });
  if (matchCount >= 2) {
    score += 15;
    indicators.push("Textbook-style descriptive comments");
  }

  // Excessive comments
  const lines = code.split('\n');
  const commentLines = lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('/*')).length;
  if (commentLines / lines.length > 0.4) {
    score += 10;
    indicators.push("High comment-to-code ratio");
  }

  // AI-style naming (overly descriptive, CamelCase everywhere)
  const aiNames = [
    /helper/i, /wrapper/i, /handler/i, /processor/i, /util/i, /service/i,
    /fetchData/i, /processInput/i, /validateForm/i
  ];
  let aiNameMatch = 0;
  aiNames.forEach(regex => {
    const matches = code.match(new RegExp(regex, 'gi'));
    if (matches) aiNameMatch += matches.length;
  });
  if (aiNameMatch > 5) {
    score += 10;
    indicators.push("Generic AI-style identifier naming");
  }

  // Uniform template usage
  if (code.includes('try {') && code.includes('} catch (error) {') && code.includes('console.error')) {
    score += 5;
    indicators.push("Standardized error handling templates");
  }

  return { score, indicators };
};

const analyzeStatistics = (code) => {
  let score = 0;
  const indicators = [];
  const lines = code.split('\n').filter(l => l.trim() !== '');

  // Line length consistency
  const lengths = lines.map(l => l.length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev < 15 && lines.length > 10) {
    score += 15;
    indicators.push("Uniform line-length distribution");
  }

  // Syntax uniformity (balanced blocks)
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (openBraces > 0 && openBraces === closeBraces) {
    // Human code often has typos or slightly unconventional spacing, AI is perfect
    const perfectSpacing = (code.match(/\) \{/g) || []).length === openBraces;
    if (perfectSpacing && openBraces > 3) {
      score += 10;
      indicators.push("High syntax structural uniformity");
    }
  }

  // Token entropy (Simplified)
  const words = code.split(/\W+/).filter(w => w.length > 2);
  const uniqueWords = new Set(words);
  const diversity = uniqueWords.size / words.length;
  if (diversity < 0.3) {
    score += 15;
    indicators.push("Predictable token repetition patterns");
  }

  return { score, indicators };
};

const analyzeAST = (code) => {
  let score = 0;
  const indicators = [];

  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });

  let functionCount = 0;
  let genericLogicCount = 0;
  
  const traverse = (node) => {
    if (!node) return;
    
    // Detect overly generic abstractions
    if (node.type === "FunctionDeclaration" || node.type === "ArrowFunctionExpression") {
      functionCount++;
    }

    // Repeated helper wrappers (simple functions returning something else immediately)
    if (node.type === "ReturnStatement" && node.argument && node.argument.type === "CallExpression") {
      genericLogicCount++;
    }

    for (const key in node) {
      if (node[key] && typeof node[key] === "object") {
        if (Array.isArray(node[key])) {
          node[key].forEach(traverse);
        } else {
          traverse(node[key]);
        }
      }
    }
  };

  traverse(ast);

  if (functionCount > 3 && genericLogicCount / functionCount > 0.5) {
    score += 20;
    indicators.push("Shallow architectural abstractions detected");
  }

  if (functionCount > 5) {
    score += 10;
    indicators.push("Systematic component organization");
  }

  return { score, indicators };
};

const calculateConfidence = (code, indicatorCount) => {
  const lengthFactor = Math.min(code.length / 2000, 1);
  const indicatorFactor = Math.min(indicatorCount / 5, 1);
  return Math.round((lengthFactor * 0.4 + indicatorFactor * 0.6) * 100);
};

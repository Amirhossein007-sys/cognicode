/* ═══════════════════════════════════════════════
   کدنما — موتور رنگ‌آمیزی کد و تشخیص زبان
   پالت: VS Code Dark+  |  بدون وابستگی خارجی
   ═══════════════════════════════════════════════ */
'use strict';

window.Syntax = (function () {

  const esc = function (s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  const NUM = String.raw`\b(?:0[xXbBoO][0-9a-fA-F_]+|\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?)\b`;
  const STR2 = String.raw`"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'`;
  const TPL = '`(?:\\\\.|[^`\\\\])*`';

  /* ── سازنده توکن‌های زبان‌های شبیه C ── */
  function cLike(opts) {
    const toks = [
      ['c-com', opts.com || (String.raw`//[^\n]*|/\*[\s\S]*?\*/`)],
      ['c-str', STR2 + (opts.tpl ? '|' + TPL : '')],
      ['c-num', NUM]
    ];
    if (opts.hash) toks.push(['c-pre', String.raw`#[ \t]*\w+`]);
    if (opts.attr) toks.push(['c-attr', opts.attr]);
    toks.push(['c-attr', String.raw`@[A-Za-z_]\w*`]);
    if (opts.kw) toks.push(['c-kw', String.raw`\b(?:` + opts.kw + String.raw`)\b`]);
    if (opts.types) toks.push(['c-type', String.raw`\b(?:` + opts.types + String.raw`)\b`]);
    if (opts.caps !== false) toks.push(['c-type', String.raw`\b[A-Z]\w*\b`]);
    toks.push(['c-fn', String.raw`[A-Za-z_$][\w$]*(?=\s*\()`]);
    toks.push(['c-op', String.raw`[{}()\[\];,.?:]|[-+*/%<>=!&|^~]+`]);
    return toks;
  }

  const JS_KW = 'async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|from|function|get|if|import|in|instanceof|let|new|of|return|set|static|super|switch|this|throw|try|typeof|var|void|while|with|yield|as';
  const JS_TY = 'true|false|null|undefined|NaN|Infinity|console|window|document|Math|JSON|Object|Array|String|Number|Boolean|Promise|Map|Set|Symbol|Error|Date|RegExp|globalThis';

  const SPECS = {
    swift: {
      toks: cLike({
        kw: 'associatedtype|class|deinit|enum|extension|fileprivate|func|import|init|inout|internal|operator|private|protocol|public|static|struct|subscript|typealias|var|break|case|continue|default|defer|do|else|fallthrough|for|guard|if|in|repeat|return|switch|where|while|as|Any|catch|false|is|nil|rethrows|super|self|Self|throw|throws|true|try|async|await|some|any|weak|unowned|lazy|mutating|nonmutating|required|convenience|distributed|indirect|infix|postfix|prefix',
        types: 'Int|Double|Float|Bool|String|Character|Void|AnyObject|Array|Dictionary|Set|Optional|Result|CGFloat|CGPoint|CGSize|CGRect|Date|Data|URL|View|Color|Image|Text|State|Binding|ObservableObject|Published|EnvironmentObject|Error|Never'
      })
    },
    python: {
      toks: [
        ['c-com', String.raw`#[^\n]*`],
        ['c-str', String.raw`(?:[rRbBfFuU]{0,2})(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')`],
        ['c-num', NUM],
        ['c-attr', String.raw`@[A-Za-z_]\w*`],
        ['c-kw', String.raw`\b(?:and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield|match|case|True|False|None)\b`],
        ['c-type', String.raw`\b(?:int|float|str|list|dict|set|tuple|bool|bytes|object|self|cls|print|len|range|enumerate|zip|map|filter|sorted|reversed|sum|min|max|abs|round|open|isinstance|type|super|staticmethod|classmethod|property)\b`],
        ['c-fn', String.raw`[A-Za-z_]\w*(?=\s*\()`],
        ['c-op', String.raw`[{}()\[\];,.:]|[-+*/%<>=!&|^~]+`]
      ]
    },
    javascript: { toks: cLike({ kw: JS_KW, types: JS_TY, tpl: true }) },
    typescript: {
      toks: cLike({
        kw: JS_KW + '|interface|type|enum|namespace|declare|abstract|implements|readonly|public|private|protected|keyof|infer|is|satisfies|override|out',
        types: JS_TY + '|string|number|boolean|any|unknown|never|object|symbol|bigint',
        tpl: true
      })
    },
    java: {
      toks: cLike({
        kw: 'abstract|assert|break|case|catch|class|const|continue|default|do|else|enum|extends|final|finally|for|goto|if|implements|import|instanceof|interface|native|new|package|private|protected|public|record|return|sealed|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|var|void|volatile|while|yield|permits|non-sealed',
        types: 'String|Integer|Double|Float|Boolean|Character|Byte|Short|Long|Object|List|Map|Set|ArrayList|HashMap|HashSet|LinkedList|Optional|Stream|System|Thread|Exception|RuntimeException'
      })
    },
    c: {
      toks: cLike({
        hash: true,
        kw: 'auto|break|case|const|continue|default|do|else|enum|extern|for|goto|if|inline|register|restrict|return|sizeof|static|struct|switch|typedef|union|volatile|while',
        types: 'bool|char|double|float|int|long|short|signed|unsigned|void|size_t|ssize_t|FILE|NULL|true|false|uint8_t|uint32_t|int32_t|int64_t'
      })
    },
    cpp: {
      toks: cLike({
        hash: true, tpl: true,
        kw: 'alignas|alignof|auto|break|case|catch|class|const|consteval|constexpr|constinit|const_cast|continue|decltype|default|delete|do|dynamic_cast|else|enum|explicit|export|extern|for|friend|goto|if|inline|mutable|namespace|new|noexcept|operator|private|protected|public|reinterpret_cast|requires|return|sizeof|static|static_cast|struct|switch|template|this|thread_local|throw|try|typedef|typeid|typename|union|using|virtual|void|volatile|while|concept|co_await|co_return|co_yield|nullptr|true|false|override|final',
        types: 'bool|char|char8_t|char16_t|char32_t|double|float|int|long|short|signed|unsigned|void|wchar_t|size_t|string|string_view|vector|map|unordered_map|set|unordered_set|pair|tuple|array|shared_ptr|unique_ptr|weak_ptr|optional|variant|any|function|cout|cin|cerr|endl|std'
      })
    },
    csharp: {
      toks: cLike({
        kw: 'abstract|as|base|break|case|catch|checked|class|const|continue|default|delegate|do|else|enum|event|explicit|extern|finally|fixed|for|foreach|goto|if|implicit|in|init|interface|internal|is|lock|namespace|new|operator|out|override|params|private|protected|public|readonly|record|ref|return|required|sbyte|sealed|sizeof|stackalloc|static|switch|this|throw|try|typeof|unchecked|unsafe|using|var|virtual|void|volatile|while|get|set|value|when|and|or|not|global',
        types: 'String|Int32|Int64|Int16|Double|Single|Boolean|Char|Byte|Object|Decimal|List|Dictionary|HashSet|Queue|Stack|Console|Math|Task|IEnumerable|IList|IDictionary|Exception|DateTime|TimeSpan|Guid|CancellationToken'
      })
    },
    go: {
      toks: cLike({
        caps: false,
        kw: 'break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var|nil|true|false|iota',
        types: 'string|bool|byte|rune|error|any|int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|uintptr|float32|float64|complex64|complex128'
      })
    },
    rust: {
      toks: (function () {
        const t = cLike({
          kw: 'as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while',
          types: 'i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str|String|Vec|Option|Result|Box|Rc|Arc|RefCell|Mutex|HashMap|HashSet|Ok|Err|Some|None|println|print|eprintln|format|vec|panic'
        });
        t.splice(3, 0, ['c-attr', String.raw`#!?\[[^\]]*\]`]);
        return t;
      })()
    },
    php: {
      toks: (function () {
        const t = cLike({
          com: String.raw`//[^\n]*|#[^\n]*|/\*[\s\S]*?\*/`,
          caps: false,
          kw: 'abstract|and|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|do|echo|else|elseif|empty|endforeach|endif|endswitch|endwhile|enum|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include_once|include|instanceof|insteadof|interface|isset|list|match|namespace|new|or|print|private|protected|public|readonly|require_once|require|return|static|switch|throw|trait|try|unset|use|var|while|xor|yield|true|false|null|self|parent',
          types: 'int|string|bool|float|void|mixed|iterable|object|never'
        });
        t.splice(3, 0, ['c-attr', String.raw`\$[A-Za-z_]\w*`]);
        return t;
      })()
    },
    ruby: {
      toks: cLike({
        com: String.raw`#[^\n]*`,
        kw: 'alias|and|begin|break|case|class|def|do|else|elsif|end|ensure|false|for|if|in|module|next|nil|not|or|redo|rescue|retry|return|self|super|then|true|undef|unless|until|when|while|yield|require|require_relative|puts|print|p|raise|new|lambda|proc|attr_accessor|attr_reader|attr_writer|module_function|private|public|protected|freeze',
        types: 'Integer|Float|String|Symbol|Array|Hash|Set|Range|Proc|NilClass|TrueClass|FalseClass|Struct|Object|Kernel|IO|File|Dir|Thread|Exception|StandardError'
      })
    },
    kotlin: {
      toks: cLike({
        kw: 'as|break|by|class|continue|do|else|false|for|fun|if|in|interface|is|null|object|package|return|super|this|throw|true|try|typealias|typeof|val|var|when|while|import|data|sealed|open|override|private|public|internal|protected|companion|init|constructor|suspend|inline|reified|crossinline|noinline|lateinit|const|lazy|where|get|set|operator|infix|out|vararg|field|it',
        types: 'Int|Double|Float|Boolean|Char|String|Unit|Any|Nothing|List|Map|Set|MutableList|MutableMap|MutableSet|Array|Pair|Triple|Sequence|Flow|println|print|listOf|mapOf|setOf|mutableListOf|mutableMapOf'
      })
    },
    dart: {
      toks: cLike({
        kw: 'abstract|as|assert|async|await|break|case|catch|class|const|continue|covariant|default|deferred|do|dynamic|else|enum|export|extends|extension|external|factory|false|final|finally|for|get|if|implements|import|in|interface|is|late|library|mixin|new|null|on|operator|part|required|rethrow|return|set|show|static|super|switch|sync|this|throw|true|try|typedef|var|void|while|with|yield',
        types: 'int|double|num|bool|String|List|Map|Set|Iterable|Future|Stream|Widget|BuildContext|State|StatelessWidget|StatefulWidget|print'
      })
    },
    html: {
      toks: [
        ['c-com', String.raw`<!--[\s\S]*?-->`],
        ['c-tag', String.raw`</?[A-Za-z][\w:-]*`],
        ['c-str', String.raw`"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'`],
        ['c-attr', String.raw`[A-Za-z-]+(?==)`],
        ['c-op', String.raw`[<>/=]`]
      ]
    },
    css: {
      toks: [
        ['c-com', String.raw`/\*[\s\S]*?\*/`],
        ['c-str', String.raw`"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'`],
        ['c-kw', String.raw`@[a-zA-Z-]+|!important`],
        ['c-num', String.raw`#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|em|rem|vh|vw|vmin|vmax|%|s|ms|deg|fr|ch|ex|pt)?\b`],
        ['c-prop', String.raw`[-a-zA-Z]+(?=\s*:)`],
        ['c-fn', String.raw`[a-zA-Z-]+(?=\()`],
        ['c-op', String.raw`[{};:,()>~+*]`]
      ]
    },
    sql: {
      flag: 'gi',
      toks: [
        ['c-com', String.raw`--[^\n]*|/\*[\s\S]*?\*/`],
        ['c-str', String.raw`'(?:''|[^'\n])*'`],
        ['c-num', NUM],
        ['c-kw', String.raw`\b(?:SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|ADD|COLUMN|JOIN|LEFT|RIGHT|FULL|INNER|OUTER|CROSS|ON|GROUP|BY|ORDER|HAVING|LIMIT|OFFSET|AS|AND|OR|NOT|NULL|IS|IN|LIKE|BETWEEN|DISTINCT|UNION|ALL|CASE|WHEN|THEN|ELSE|END|PRIMARY|KEY|FOREIGN|REFERENCES|DEFAULT|UNIQUE|INDEX|VIEW|EXISTS|ASC|DESC|IF|CASCADE|CONSTRAINT|AUTO_INCREMENT|SERIAL)\b`],
        ['c-type', String.raw`\b(?:INT|INTEGER|VARCHAR|NVARCHAR|CHAR|TEXT|DATE|DATETIME|TIMESTAMP|TIME|BOOLEAN|BOOL|DECIMAL|NUMERIC|FLOAT|DOUBLE|REAL|BIGINT|SMALLINT|TINYINT|SERIAL|UUID|JSON|JSONB|BLOB|BYTEA)\b`],
        ['c-fn', String.raw`[A-Za-z_]\w*(?=\s*\()`],
        ['c-op', String.raw`[(),;.]|[-+*/<>=!]+`]
      ]
    },
    json: {
      toks: [
        ['c-prop', String.raw`"(?:\\.|[^"\\])*"(?=\s*:)`],
        ['c-str', String.raw`"(?:\\.|[^"\\])*"`],
        ['c-num', String.raw`-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b`],
        ['c-kw', String.raw`\b(?:true|false|null)\b`],
        ['c-op', String.raw`[{}\[\],:]`]
      ]
    },
    bash: {
      toks: [
        ['c-com', String.raw`#[^\n]*`],
        ['c-str', String.raw`"(?:\\.|[^"\\])*"|'[^']*'`],
        ['c-attr', String.raw`\$\{[^}]*\}|\$[\w@#?*!-]+`],
        ['c-kw', String.raw`\b(?:if|then|else|elif|fi|for|while|until|do|done|case|esac|function|return|in|break|continue|local|export|readonly|declare|source|set|unset|shift|trap|eval|exec|exit|echo|read|cd|printf|test)\b`],
        ['c-type', String.raw`\b(?:sudo|apt|apt-get|git|npm|npx|node|python3|python|pip3|pip|curl|wget|mkdir|rm|cp|mv|ls|cat|grep|sed|awk|chmod|chown|tar|zip|unzip|ssh|scp|docker|make|systemctl|brew|code|open|touch|head|tail|find|which|man|nano|vim|jq|sqlite3)\b`],
        ['c-num', NUM],
        ['c-op', '[|&;<>()$`\\\\]+']
      ]
    },
    objectivec: {
      toks: (function () {
        const t = cLike({
          kw: 'id|self|super|nil|Nil|NULL|YES|NO|alloc|init|new|copy|mutableCopy|retain|release|autorelease|dealloc|typedef|struct|enum|union|const|static|extern|void|return|if|else|for|while|do|switch|case|default|break|continue|goto|sizeof|nonatomic|strong|weak|readonly|readwrite',
          types: 'NSString|NSMutableString|NSArray|NSMutableArray|NSDictionary|NSMutableDictionary|NSSet|NSNumber|NSDate|NSData|NSMutableData|NSObject|UIViewController|UIView|UILabel|UIButton|UIImageView|UITableView|NSInteger|NSUInteger|CGFloat|CGRect|CGPoint|CGSize|BOOL|SEL|Class|Protocol|NSError|NSNotificationCenter'
        });
        t.splice(1, 0, ['c-str', String.raw`@"(?:\\.|[^"\\])*"`]);
        return t;
      })()
    },
    scala: {
      toks: cLike({
        kw: 'package|import|object|class|trait|extends|with|final|abstract|sealed|case|implicit|override|def|val|var|lazy|type|for|yield|while|do|if|else|match|throw|try|catch|finally|return|new|this|super|private|protected|public|null|true|false|given|using|enum|infix|inline|opaque|extension',
        types: 'Int|Long|Double|Float|Boolean|Char|Byte|Short|String|Unit|Any|AnyRef|AnyVal|Nothing|List|Map|Set|Option|Some|None|Either|Try|Future|Promise|Seq|Array|Vector|Tuple|StringBuilder|IndexedSeq'
      })
    },
    perl: {
      toks: [
        ['c-com', String.raw`#[^\n]*`],
        ['c-str', String.raw`"(?:\\.|[^"\\])*"|'[^']*'|q[qrmwx]?\{[^}]*\}`],
        ['c-attr', String.raw`[$@%]\{?\w*\}?`],
        ['c-num', NUM],
        ['c-kw', String.raw`\b(?:my|our|local|sub|if|elsif|unless|else|while|until|for|foreach|do|last|next|redo|return|use|no|package|require|new|bless|ref|exists|delete|defined|wantarray|goto|eval|print|printf|say|sprintf|chomp|chop|shift|unshift|push|pop|keys|values|each|sort|map|grep|join|split|open|close|die|warn|croak|sprintf|uc|lc|length|substr|index|rindex)\b`],
        ['c-fn', String.raw`\w+(?=\s*\()`],
        ['c-op', String.raw`->|=>|//|[;,.]` + '|[-+*/%<>=!&|^~]+']
      ]
    },
    lua: {
      toks: [
        ['c-com', String.raw`--\[[^\]]*\[[\s\S]*?\]\]|--[^\n]*`],
        ['c-str', String.raw`"(?:\\.|[^"\\])*"|'[^'\\]*'|\[\[[\s\S]*?\]\]`],
        ['c-num', NUM],
        ['c-kw', String.raw`\b(?:and|break|do|else|elseif|end|false|for|function|goto|if|in|local|nil|not|or|repeat|return|then|true|until|while)\b`],
        ['c-type', String.raw`\b(?:print|pairs|ipairs|string|table|math|io|os|coroutine|debug|tostring|tonumber|type|require|pcall|xpcall|error|assert|setmetatable|getmetatable|rawget|rawset|rawequal|select|unpack|next|load|dofile|collectgarbage)\b`],
        ['c-fn', String.raw`[A-Za-z_]\w*(?=\s*\()`],
        ['c-op', String.raw`\.\.\.|\.\.|[{}()\[\];,.:]|[-+*/%#<>=!&|^~]+`]
      ]
    },
    r: {
      toks: [
        ['c-com', String.raw`#[^\n]*`],
        ['c-str', String.raw`"(?:\\.|[^"\\])*"|'[^']*'`],
        ['c-num', NUM],
        ['c-kw', String.raw`\b(?:if|else|for|while|repeat|break|next|return|function|TRUE|FALSE|NULL|NA|NA_integer_|NA_real_|NaN|Inf|in|library|require|attach|detach|source|ifelse)\b`],
        ['c-type', String.raw`\b(?:c|paste|paste0|print|cat|length|names|ncol|nrow|head|tail|summary|str|data\.frame|matrix|vector|list|factor|levels|mean|median|sd|var|sum|min|max|range|sort|order|rank|apply|sapply|lapply|tapply|mapply|aggregate|merge|cbind|rbind|subset|which|unique|read\.csv|write\.csv|read\.table|plot|hist|boxplot|barplot|ggplot|aes|geom_point|geom_line|geom_bar|theme|labs)\b`],
        ['c-fn', String.raw`[\w.]+(?=\s*\()`],
        ['c-op', String.raw`<-|<<-|->|\$|@|~|\|\||&&|[{}()\[\];,.:]|[-+*/%<>!=&|^~]+`]
      ]
    },
    julia: {
      toks: [
        ['c-com', String.raw`#=[\s\S]*?=#|#[^\n]*`],
        ['c-str', String.raw`"(?:\\.|[^"\\])*"` + '|`(?:\\\\.|[^`\\\\])*`'],
        ['c-num', NUM],
        ['c-attr', String.raw`@[A-Za-z_]\w*`],
        ['c-kw', String.raw`\b(?:function|end|if|elseif|else|for|while|return|using|import|export|module|baremodule|struct|mutable|abstract|primitive|const|let|local|global|do|begin|try|catch|finally|throw|true|false|nothing|missing|in|isa|where|new|break|continue|quote|macro)\b`],
        ['c-type', String.raw`\b(?:Int|Int8|Int16|Int32|Int64|Int128|UInt|Float16|Float32|Float64|Bool|Char|String|SubString|Array|Vector|Matrix|Dict|Set|Tuple|NamedTuple|Symbol|Any|Nothing|Union|IO|println|print|push!|append!|pop!|length|size|zeros|ones|range|collect|map|filter|reduce|foldl|sum|minimum|maximum|sort|show|typeof|convert|parse|open|readline|printf)\b`],
        ['c-fn', String.raw`[A-Za-z_]\w*!?(?=\s*\()`],
        ['c-op', String.raw`::|<:|:>|->|=>|\.\.|[{}()\[\];,.:]|[-+*/%<>!=&|^~$\\]+`]
      ]
    },
    haskell: {
      toks: [
        ['c-com', String.raw`\{-[\s\S]*?-\}|--[^\n]*`],
        ['c-str', String.raw`"(?:\\.|[^"\\])*"`],
        ['c-num', NUM],
        ['c-kw', String.raw`\b(?:module|import|qualified|as|hiding|where|let|in|do|case|of|if|then|else|data|type|newtype|deriving|instance|class|default|infix|infixl|infixr|foreign|ccall|return|pure|mdo|rec)\b`],
        ['c-type', String.raw`\b(?:Int|Integer|Float|Double|Bool|Char|String|Maybe|Just|Nothing|Either|Left|Right|IO|Ordering|EQ|LT|GT|Show|Read|Eq|Ord|Num|Integral|Fractional|Monad|Functor|Applicative|Foldable|Traversable|fst|snd|head|tail|last|init|null|length|map|filter|foldl|foldr|foldl1|sum|product|reverse|zip|zipWith|unzip|take|drop|takeWhile|dropWhile|splitAt|concat|concatMap|intercalate|words|lines|putStrLn|putStr|print|getLine|read|show|maxBound|minBound)\b`],
        ['c-op', String.raw`->|<-|=>|::|[{}()\[\];,.]` + '|[-+*/%<>!=&|^~#]+']
      ]
    },
    elixir: {
      toks: [
        ['c-com', String.raw`#[^\n]*`],
        ['c-str', String.raw`"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'[^']*'|:[A-Za-z_]\w*`],
        ['c-num', NUM],
        ['c-attr', String.raw`@[A-Za-z_]\w*`],
        ['c-kw', String.raw`\b(?:def|defp|defmodule|defmacro|defmacrop|defstruct|defprotocol|defimpl|defexception|defguard|do|end|if|else|unless|cond|case|fn|alias|import|require|use|for|in|with|raise|try|rescue|catch|after|throw|true|false|nil|and|or|not|when|quote|unquote)\b`],
        ['c-type', String.raw`\b[A-Z]\w*\b|\b(?:IO|Enum|Map|List|String|Integer|Float|Atom|Tuple|MapSet|Range|Date|Time|DateTime|NaiveDateTime|File|System|Process|Agent|Task|GenServer|Supervisor|Application|Logger|Code|inspect|elem|put_elem|is_atom|is_binary|is_number)\b`],
        ['c-fn', String.raw`[a-z_]\w*(?=\s*\()`],
        ['c-op', String.raw`\|>|=>|:=|\^\^\*|[{}()\[\];,.:]|[-+*/%<>!=&|^~]+`]
      ]
    },
    matlab: {
      toks: [
        ['c-com', String.raw`%[^\n]*`],
        ['c-str', String.raw`'(?:''|[^'\n])*'`],
        ['c-num', NUM],
        ['c-kw', String.raw`\b(?:function|end|if|elseif|else|for|while|switch|case|otherwise|break|continue|return|try|catch|global|persistent|classdef|properties|methods|events|enumeration|parfor|spmd)\b`],
        ['c-type', String.raw`\b(?:zeros|ones|eye|rand|randn|randi|linspace|logspace|size|length|numel|find|sum|mean|median|std|var|max|min|sort|sortrows|reshape|transpose|ctranspose|inv|det|rank|eig|svd|norm|plot|subplot|figure|histogram|bar|scatter|surf|mesh|contour|title|xlabel|ylabel|legend|grid|disp|fprintf|sprintf|input|load|save|cell|struct|arrayfun|cellfun|strcat|strsplit|num2str|str2num|isempty|isinteger)\b`],
        ['c-fn', String.raw`[\w.]+(?=\s*\()`],
        ['c-op', String.raw`\.\*|\./|\.\^|\.'|@|[{}()\[\];,.:]|[-+*/%<>!=&|^~]+`]
      ]
    },
    groovy: {
      toks: cLike({
        tpl: true,
        kw: 'def|var|class|interface|trait|enum|extends|implements|import|package|new|this|super|if|else|for|while|switch|case|default|break|continue|return|try|catch|finally|throw|throws|as|in|it|static|final|abstract|public|private|protected|synchronized|void|null|true|false|assert|with|trait|yield',
        types: 'String|Integer|Double|Float|Boolean|List|Map|Set|Range|Object|Closure|GString|BigDecimal|BigInteger|Character|StringBuilder|File|InputStream|OutputStream|Reader|Writer|HttpClient|JsonSlurper'
      })
    },
    fsharp: {
      toks: (function () {
        const t = cLike({
          com: String.raw`//[^\n]*|\(\*[\s\S]*?\*\)`,
          caps: false,
          kw: 'let|rec|and|in|if|then|elif|else|match|with|function|type|module|namespace|open|do|done|for|to|downto|while|try|finally|raise|failwith|inherit|member|override|abstract|interface|mutable|ref|use|yield|return|new|base|this|static|struct|class|end|true|false|null|void|when|begin|lazy|global',
          types: 'int|float|double|decimal|bool|byte|char|string|unit|option|Some|None|list|array|seq|Map|Set|Result|Ok|Error|Async|Task|List|Console|Math|Printf|KeyValuePair'
        });
        t.splice(3, 0, ['c-attr', String.raw`\[<[\s\S]*?>\]`]);
        return t;
      })()
    },
    vb: {
      flag: 'gi',
      toks: [
        ['c-com', String.raw`'[^\n]*`],
        ['c-str', String.raw`"(?:[^"\n]|"")*"`],
        ['c-num', NUM],
        ['c-kw', String.raw`\b(?:AddHandler|AndAlso|As|Boolean|ByRef|ByVal|Call|Case|Catch|Char|Class|Const|Continue|Date|Decimal|Dim|Do|Double|Each|Else|ElseIf|End|Enum|Erase|Error|Event|Exit|False|Finally|For|Friend|Function|Get|GetType|GoTo|Handles|If|Implements|Imports|In|Inherits|Integer|Interface|Is|IsNot|Long|Loop|Me|Mod|Module|MustInherit|MustOverride|MyBase|MyClass|Namespace|New|Next|Nothing|Not|NotInheritable|NotOverridable|Object|Of|On|Operator|Option|Optional|Or|OrElse|Overloads|Overridable|Overrides|ParamArray|Partial|Private|Property|Protected|Public|RaiseEvent|ReadOnly|ReDim|RemoveHandler|Resume|Return|Select|Set|Shadows|Shared|Short|Single|Static|Step|Stop|String|Structure|Sub|SyncLock|Then|Throw|To|True|Try|TypeOf|Until|Using|When|While|Widening|With|WithEvents|WriteOnly|Xor)\b`],
        ['c-fn', String.raw`[\w.]+(?=\s*\()`],
        ['c-op', String.raw`\+=|-=|\*=|/=|[(){}[\],.:]|[=<>+\-*/&^]`]
      ]
    },
    pascal: {
      toks: [
        ['c-com', String.raw`\{[\s\S]*?\}|\(\*[\s\S]*?\*\)|//[^\n]*`],
        ['c-str', String.raw`'(?:''|[^'\n])*'`],
        ['c-num', String.raw`[#$][0-9a-fA-F]+|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b`],
        ['c-kw', String.raw`\b(?:program|begin|end|var|const|type|procedure|function|if|then|else|for|to|downto|do|while|repeat|until|case|of|record|array|string|integer|real|boolean|char|byte|word|uses|unit|interface|implementation|initialization|finalization|class|object|constructor|destructor|inherited|with|nil|true|false|and|or|not|xor|div|mod|shl|shr|set|file|packed|label|goto|exit|break|continue|try|except|finally|raise|property|published|public|private|protected|virtual|override|overload|inline|strict)\b`],
        ['c-fn', String.raw`[A-Za-z_]\w*(?=\s*\()`],
        ['c-op', String.raw`:=|\.\.|[(){}\[\];,.:^@]|[-+*/<>]=?`]
      ]
    },
    solidity: {
      toks: cLike({
        kw: 'pragma|solidity|contract|interface|library|abstract|is|function|constructor|modifier|event|emit|error|struct|enum|mapping|using|for|import|from|as|public|private|internal|external|view|pure|payable|memory|storage|calldata|returns|return|if|else|for|while|do|break|continue|new|delete|require|revert|assert|unchecked|virtual|override|immutable|constant|indexed|anonymous|receive|fallback|true|false|this|super|selfdestruct',
        types: 'address|bool|string|bytes|bytes1|bytes2|bytes4|bytes8|bytes16|bytes32|uint|uint8|uint16|uint32|uint64|uint128|uint256|int|int8|int16|int32|int64|int128|int256|fixed|ufixed|msg|block|tx|abi|wei|gwei|ether|seconds|minutes|hours|days|weeks'
      })
    },
    asm: {
      toks: [
        ['c-com', String.raw`;[^\n]*`],
        ['c-str', String.raw`"(?:\\.|[^"\\])*"|'[^']*'`],
        ['c-num', String.raw`\b(?:0[xX][0-9a-fA-F]+|[0-9a-fA-F]+[hH]|\d+|0[bB][01]+)\b`],
        ['c-attr', String.raw`%[a-z][a-z0-9]+`],
        ['c-kw', String.raw`\b(?:mov|movb|movw|movl|movq|lea|push|pushq|pop|popq|call|ret|jmp|je|jne|jz|jnz|jg|jl|jge|jle|ja|jb|jae|jbe|loop|add|addq|sub|imul|mul|idiv|div|inc|dec|neg|and|or|xor|not|shl|shr|sar|cmp|test|nop|int|syscall|enter|leave|section|global|extern|bits|org|db|dw|dd|dq|resb|resw|resd|resq|equ|times|byte|word|dword|qword|align|default)\b`],
        ['c-type', String.raw`%?[re]?[abcde]x|%?[re]s[iI]|%?[re]d[iI]|%r(?:[89]|1[0-5])[bwd]?|%?r[bcd]x|%?r[sd]i|%?rbp|%?rsp|%?[abcd]l|[abcd]x|[abcd]l`],
        ['c-fn', String.raw`\.?[A-Za-z_][\w.$]*(?=:)`],
        ['c-op', String.raw`\[[^\]]*\]|[()*,]`]
      ]
    },
    text: { toks: [] }
  };

  /* ── تشخیص هوشمند و چندلایه‌ای زبان (دقت بالا روی ۳۴ زبان) ── */
  function detect(code) {
    if (!code || !code.trim()) return 'text';
    var trimmed = code.trim();

    // ۱) لنگرهای قطعی و منحصر‌به‌فرد (تطابق آنی بدون ابهام)
    if (/<\?php\b|<\?=/i.test(code)) return 'php';
    if (/<!DOCTYPE\s+html|<html[\s>]|<\/(?:html|head|body|div|p|span|section)>/i.test(code)) return 'html';
    if (/^\s*\/\/\s*SPDX-License-Identifier|\bpragma\s+solidity\b/i.test(code)) return 'solidity';
    if (/^#!.*\b(?:bash|sh|zsh)\b/m.test(code)) return 'bash';
    if (/\b(?:import\s+SwiftUI|import\s+Combine|import\s+UIKit)\b/.test(code)) return 'swift';
    if (/\bpublic\s+static\s+void\s+main\s*\(\s*String\[\]/.test(code) || /System\.out\.print/.test(code)) return 'java';
    if (/\bdefmodule\s+[A-Z]\w*\s+do\b/.test(code)) return 'elixir';
    if (/\bmodule\s+[A-Za-z_]\w*\s+where\b/.test(code)) return 'haskell';

    // لنگرهای قطعی ویژوال بیسیک در برابر سی‌شارپ
    if (/\b(?:Dim\s+\w+\s+As|End\s+Sub|Sub\s+Main|End\s+Module)\b/i.test(code)) return 'vb';
    if (/\bConsole\.WriteLine\b|\busing\s+System\b/.test(code)) return 'csharp';

    // لنگرهای قطعی پاسکال (برنامه، یونیت، کتابخانه، بلوک begin..end. یا uses)
    if (/\b(?:program|unit|library)\s+[A-Za-z_]\w*\s*;/i.test(code) ||
        /\buses\s+[A-Za-z_][\w,\s]*;/i.test(code) ||
        (/\bbegin\b/i.test(code) && /\bend\.\s*$/m.test(code))) {
      return 'pascal';
    }

    // لنگر قطعی گو
    if (/\bpackage\s+main\b/.test(code) && /\bfunc\s+main\s*\(/.test(code)) return 'go';

    // لنگر قطعی آبجکتیو-سی
    if (/#import\s*<Foundation\/Foundation\.h>|#import\s*<UIKit\/UIKit\.h>|@interface\s+\w+\s*:\s*NSObject/i.test(code)) return 'objectivec';

    // جیسون خالص
    if (/^\s*[\{\[][\s\S]*[\}\]]\s*$/.test(trimmed)) {
      try {
        var parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null) {
          if (!/;\s*$/m.test(trimmed)) return 'json';
        }
      } catch (_) {}
    }

    // کوئری استاندارد اس‌کیو‌ال
    if (/^\s*(?:SELECT\b[\s\S]+?\bFROM\b|INSERT\s+INTO\b|CREATE\s+TABLE\b|UPDATE\b[\s\S]+?\bSET\b|DELETE\s+FROM\b|ALTER\s+TABLE\b|DROP\s+TABLE\b)/i.test(trimmed)) {
      return 'sql';
    }

    // ۲) وزن‌دهی الگوهای اختصاصی و ساختاری زبان‌ها
    var scores = {};
    function add(lang, pts) {
      scores[lang] = (scores[lang] || 0) + pts;
    }

    // پاسکال (Pascal)
    var pas = 0;
    if (/\b(?:writeln|readln)\s*\(/i.test(code)) pas += 6;
    if (/\b(?:write|read)\s*\(/i.test(code) && !/console\.|sys\.|io\.|file\./i.test(code)) pas += 3;
    if (/\bprocedure\s+[A-Za-z_]\w*/i.test(code)) pas += 6;
    if (/\bfunction\s+[A-Za-z_]\w*[^;]*:\s*[A-Za-z_]\w*\s*;/i.test(code)) pas += 6;
    if (/\bbegin\b/i.test(code) && /\bend[;.]/i.test(code)) pas += 6;
    if (/\btype\s+\w+\s*=\s*(?:record|class|array|set\s+of|\^)\b/i.test(code)) pas += 6;
    if (/\bvar\s+(?:[A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*\s*:\s*(?:integer|real|boolean|string|char|byte|word|longint|double)\s*;)/i.test(code)) pas += 6;
    if (/\bfor\s+\w+\s*:=\s*.*?\bto\b.*?\bdo\b/i.test(code)) pas += 6;
    if (/\brepeat\b[\s\S]*?\buntil\b/i.test(code)) pas += 5;
    if (/\bcase\s+\w+\s+of\b/i.test(code)) pas += 5;
    if (/\bif\b.*?\bthen\b/i.test(code) && !/\b(?:function|local)\b/.test(code)) pas += 4;
    if (/:=/.test(code)) pas += 2;
    if (/\bend;/i.test(code)) pas += 3;
    if (/\b(?:integer|boolean|real)\b/i.test(code) && !/:\s*(?:number|boolean)/.test(code)) pas += 2;
    if (pas > 0) add('pascal', pas);

    // سی (C)
    var cPts = 0;
    if (/#include\s*<stdio\.h>|#include\s*<stdlib\.h>|#include\s*<string\.h>|#include\s*<unistd\.h>|#include\s*<stdbool\.h>|#include\s*<math\.h>/i.test(code)) cPts += 6;
    if (/\bprintf\s*\(|\bscanf\s*\(|\bmalloc\s*\(|\bfree\s*\(/.test(code)) cPts += 4;
    if (/\btypedef\s+struct\b|\bstruct\s+\w+\s*\{/.test(code)) cPts += 3;
    if (/\b(?:int|void)\s+main\s*\(\s*(?:void|int\s+argc)?\s*\)/.test(code)) cPts += 5;
    if (/\b(?:int|char|void|float|double)\s*\*\s*[A-Za-z_]\w*/.test(code)) cPts += 3;
    if (/\bvoid\s+[A-Za-z_]\w*\s*\([^\)]*\*[\s\S]*?\{/.test(code)) cPts += 4;
    if (cPts > 0) add('c', cPts);

    // سی‌پلاس‌پلاس (C++)
    var cppPts = 0;
    if (/#include\s*<iostream>|#include\s*<vector>|#include\s*<string>|#include\s*<algorithm>|#include\s*<map>|#include\s*<memory>/i.test(code)) cppPts += 6;
    if (/\bstd::|\bcout\s*<<|\bcin\s*>>|\bstd::endl\b/.test(code)) cppPts += 6;
    if (/\btemplate\s*<|\btypename\b|\bnamespace\s+\w+\s*\{/.test(code)) cppPts += 5;
    if (/\bclass\s+\w+[^;]*\{[\s\S]*?\b(?:public|private|protected)\s*:/.test(code)) cppPts += 5;
    if (/\b(?:nullptr|constexpr)\b/.test(code)) cppPts += 4;
    if (cppPts > 0) {
      add('cpp', cppPts);
      add('c', -10); // نشانه‌های C++ زبان C را بی‌اعتبار می‌کنند
    }

    // گو (Go)
    var goPts = 0;
    if (/\bpackage\s+\w+/.test(code)) goPts += 5;
    if (/\bfunc\s+(?:\(\w+\s*\*?\w+\)\s*)?\w+\s*\(/.test(code)) goPts += 5;
    if (/\bfmt\.(?:Println|Printf|Sprintf|Print)\b/.test(code)) goPts += 5;
    if (/\bmake\s*\(\s*(?:chan|map|\[\])/.test(code)) goPts += 5;
    if (/\bgo\s+func\b|\bgo\s+\w+\(/.test(code)) goPts += 5;
    if (/:=/.test(code) && !/\bbegin\b|\bend[;.]|\bthen\b/i.test(code)) goPts += 2;
    if (/\btype\s+\w+\s+struct\s*\{/.test(code)) goPts += 5;
    if (/\btype\s+\w+\s+interface\s*\{/.test(code)) goPts += 5;
    if (/\bbegin\b|\bend[;.]|\bprocedure\b|\bthen\b/i.test(code)) goPts -= 15; // تضاد با پاسکال
    if (goPts > 0) add('go', goPts);

    // راست (Rust)
    var rsPts = 0;
    if (/\bfn\s+\w+\s*\(|\bpub\s+fn\b/.test(code)) rsPts += 5;
    if (/println!|eprintln!|vec!\[|format!/.test(code)) rsPts += 6;
    if (/\bimpl\s+\w+|\bimpl\s+.*?\bfor\b/.test(code)) rsPts += 5;
    if (/\blet\s+mut\b/.test(code)) rsPts += 5;
    if (/\bmatch\s+\w+[\s\S]*?=>/.test(code)) rsPts += 5;
    if (/\bstruct\s+\w+[\s\S]*?impl\b/.test(code)) rsPts += 5;
    if (/\bResult<|\bOption<|\bSome\(|\bNone\b|\bOk\(|\bErr\(/.test(code) && /fn\b/.test(code)) rsPts += 4;
    if (rsPts > 0) add('rust', rsPts);

    // پایتون (Python)
    var pyPts = 0;
    if (/(?:^|\n)\s*def\s+\w+\s*\(/.test(code)) pyPts += 5;
    if (/(?:^|\n)\s*class\s+\w+.*:/.test(code)) pyPts += 4;
    if (/\belif\b|\bif\s+__name__\s*==/.test(code)) pyPts += 5;
    if (/(?:^|\n)\s*(?:import\s+\w+|from\s+[\w.]+\s+import\s+\w+)/.test(code)) pyPts += 4;
    if (/\bprint\s*\(/.test(code) && !/System\.|\bprintf\b|\bfmt\./.test(code)) pyPts += 2;
    if (/\[\s*[\w.]+\s+for\s+\w+\s+in\s+/.test(code)) pyPts += 5;
    if (/\brange\s*\(|\bin\s+range\b|\b\w+\s*\*\*\s*\d+/.test(code)) pyPts += 4;
    if (/\bself\.\w+|\b__init__\b/.test(code)) pyPts += 5;
    if (pyPts > 0) add('python', pyPts);

    // تایپ‌اسکریپت (TypeScript)
    var tsPts = 0;
    if (/\binterface\s+\w+\s*\{|\btype\s+\w+\s*=(?!\s*record)/.test(code)) tsPts += 6;
    if (/\benum\s+\w+\s*\{/.test(code) && !/\b(?:public|private|static)\b/.test(code)) tsPts += 6;
    if (/:\s*(?:string|number|boolean|any|void|unknown|never)\s*[;,\)=]/.test(code) && !/\bbegin\b/i.test(code)) tsPts += 4;
    if (/<[A-Z]\w*>\(|\bas\s+const\b|\bas\s+[A-Z]\w*/.test(code)) tsPts += 5;
    if (/\bdeclare\s+(?:const|let|var|function|module)\b/.test(code)) tsPts += 6;
    if (tsPts > 0) add('typescript', tsPts);

    // جاوااسکریپت (JavaScript)
    var jsPts = 0;
    if (/(?:^|\W)(?:const|let|var)\s+\w+\s*=/.test(code) && !/\b(?:integer|boolean|real|string)\s*;/i.test(code)) jsPts += 3;
    if (/=>/.test(code) && !/match\b|case\b|fn\b/.test(code)) jsPts += 3;
    if (/console\.(?:log|warn|error|info)/.test(code)) jsPts += 5;
    if (/document\.|window\.|localStorage|sessionStorage/.test(code)) jsPts += 5;
    if (/require\(['"][\w@/.-]+['"]\)|module\.exports/.test(code)) jsPts += 5;
    if (/\bnew\s+Promise\b|\basync\s+function\b/.test(code)) jsPts += 4;
    if (jsPts > 0) add('javascript', jsPts);

    // سوئیفت (Swift)
    var swPts = 0;
    if (/@(?:State|Binding|ObservedObject|Published|Environment|StateObject)\b/.test(code)) swPts += 6;
    if (/\bguard\s+(?:let|var)\b|\bsome\s+View\b/.test(code)) swPts += 6;
    if (/\bfunc\s+\w+\s*\(.*->\s*[A-Z]\w*/.test(code)) swPts += 4;
    if (/\bstruct\s+\w+\s*:\s*View\b/.test(code)) swPts += 6;
    if (swPts > 0) add('swift', swPts);

    // جاوا (Java)
    var jvPts = 0;
    if (/\bpublic\s+class\s+\w+/.test(code)) jvPts += 4;
    if (/\bpublic\s+(?:void|int|String|boolean)\s+\w+\s*\(/.test(code)) jvPts += 3;
    if (/\bimport\s+java\./.test(code)) jvPts += 5;
    if (/@Override\b/.test(code)) jvPts += 4;
    if (/\bnew\s+ArrayList<|\bnew\s+HashMap</.test(code)) jvPts += 5;
    if (jvPts > 0) add('java', jvPts);

    // سی‌شارپ (C#)
    var csPts = 0;
    if (/\bnamespace\s+[\w.]+/.test(code)) csPts += 5;
    if (/\bget;\s*(?:set;)?\s*\}/.test(code)) csPts += 5;
    if (/\bpublic\s+class\s+\w+/.test(code) && !/\bimport\s+java/.test(code)) csPts += 3;
    if (/\basync\s+Task(?:<[\w.]+>)?\b/.test(code)) csPts += 5;
    if (/\bList<[A-Za-z]\w*>\b/.test(code) && /using\b/.test(code)) csPts += 4;
    if (csPts > 0) add('csharp', csPts);

    // کاتلین (Kotlin)
    var ktPts = 0;
    if (/\bdata\s+class\b|\bcompanion\s+object\b/.test(code)) ktPts += 6;
    if (/\bfun\s+\w+\s*\(/.test(code) && !/\bpackage\s+\w+/.test(code)) ktPts += 4;
    if (/\bval\s+\w+\s*[:=]/.test(code)) ktPts += 3;
    if (/\bimport\s+kotlin\./.test(code)) ktPts += 5;
    if (ktPts > 0) add('kotlin', ktPts);

    // دارت (Dart)
    var dtPts = 0;
    if (/\bWidget\s+build\b|StatelessWidget|StatefulWidget|setState\s*\(/.test(code)) dtPts += 6;
    if (/import\s+['"]package:flutter\//.test(code)) dtPts += 6;
    if (/\bvoid\s+main\s*\(\s*\)\s*\{[\s\S]*?runApp/.test(code)) dtPts += 6;
    if (dtPts > 0) add('dart', dtPts);

    // پی‌اچ‌پی (PHP)
    var phpPts = 0;
    if (/\$\w+\s*=\s*[^=]|\$\w+->\w+/.test(code)) phpPts += 4;
    if (/\bnamespace\s+[\w\\]+;|\buse\s+[\w\\]+;/.test(code) && /\$/.test(code)) phpPts += 5;
    if (/\$_(?:GET|POST|SERVER|SESSION|REQUEST)\b/.test(code)) phpPts += 6;
    if (phpPts > 0) add('php', phpPts);

    // روبی (Ruby)
    var rbPts = 0;
    if (/\bdef\s+\w+.*?\bend\b/s.test(code) && !/defmodule|function|begin/.test(code)) rbPts += 4;
    if (/\bputs\s+["']|\battr_accessor\b|\battr_reader\b/.test(code)) rbPts += 5;
    if (/\bdo\s*\|[\w,\s]*\|/.test(code)) rbPts += 4;
    if (/\brequire\s+['"][A-Za-z_.-]+['"]/.test(code) && !/node|express/.test(code)) rbPts += 4;
    if (rbPts > 0) add('ruby', rbPts);

    // بش / شل (Bash)
    var shPts = 0;
    if (/\becho\s+["']|\bif\s*\[.*?\];\s*then\b|\bfor\s+\w+\s+in\s+.*?;?\s*do\b/.test(code) && !/begin\b/i.test(code)) shPts += 4;
    if (/\$\([^\)]+\)|\bfi\b\s*$|\bdone\b\s*$/m.test(code)) shPts += 4;
    if (/\bexport\s+\w+=|\bsudo\s+\w+/.test(code)) shPts += 4;
    if (shPts > 0) add('bash', shPts);

    // سی‌اس‌اس (CSS)
    var cssPts = 0;
    if (/@media|@keyframes|\b(?:margin|padding|background|display|font-size|border-radius)\s*:\s*[^;]+;/i.test(code)) cssPts += 5;
    if (/[.#][A-Za-z][\w-]*\s*\{[\s\S]*?\}/.test(code)) cssPts += 4;
    if (cssPts > 0) add('css', cssPts);

    // اس‌کیو‌ال (SQL)
    var sqlPts = 0;
    if (/\bSELECT\b[\s\S]{0,100}\bFROM\b/i.test(code)) sqlPts += 5;
    if (/\bWHERE\b[\s\S]{0,100}\b(?:AND|OR|=|LIKE)\b/i.test(code) && /\bFROM\b/i.test(code)) sqlPts += 4;
    if (/\bGROUP\s+BY\b|\bORDER\s+BY\b/i.test(code)) sqlPts += 4;
    if (sqlPts > 0) add('sql', sqlPts);

    // لوآ (Lua)
    var luaPts = 0;
    if (/\blocal\s+(?:function|\w+\s*=)/.test(code)) luaPts += 5;
    if (/\bfunction\s*\([^\)]*\)[\s\S]*?\bend\b/.test(code) && !/begin\b/i.test(code)) luaPts += 4;
    if (/\brepeat\b[\s\S]*?\buntil\b/.test(code) && /\blocal\b/.test(code)) luaPts += 5;
    if (/pairs\s*\(|ipairs\s*\(|~=/.test(code)) luaPts += 5;
    if (luaPts > 0) add('lua', luaPts);

    // آر (R)
    var rPts = 0;
    if (/<-|<<-/.test(code)) rPts += 4;
    if (/\blibrary\s*\(\w+\)/.test(code)) rPts += 5;
    if (/\bdata\.frame\s*\(|\bc\s*\([^\)]+\)/.test(code)) rPts += 4;
    if (rPts > 0) add('r', rPts);

    // جولیا (Julia)
    var jlPts = 0;
    if (/\busing\s+[A-Z]\w*/.test(code)) jlPts += 5;
    if (/::(?:Float64|Int64|Matrix|Vector)\b/.test(code)) jlPts += 5;
    if (/\bfunction\s+\w+\([^\)]*\)::[A-Za-z]/.test(code)) jlPts += 5;
    if (jlPts > 0) add('julia', jlPts);

    // هسکل (Haskell)
    var hsPts = 0;
    if (/\bmodule\s+\w+\s+where\b/.test(code)) hsPts += 6;
    if (/::\s*[A-Z]\w*(?:\s*->\s*[A-Z]\w*)+/.test(code)) hsPts += 6;
    if (/\bmain\s*=\s*do\b|\bputStrLn\b/.test(code)) hsPts += 5;
    if (hsPts > 0) add('haskell', hsPts);

    // الکسیر (Elixir)
    var exPts = 0;
    if (/\bdefp?\s+\w+.*do\s*$/m.test(code)) exPts += 5;
    if (/\|\>|\bIO\.(?:puts|inspect)/.test(code)) exPts += 5;
    if (exPts > 0) add('elixir', exPts);

    // متلب (Matlab)
    var matPts = 0;
    if (/\bfunction\s+.*?=\s*\w+\([^\)]*\)[\s\S]*?\bend\b/.test(code)) matPts += 5;
    if (/\bclc\b|\bclearvars\b|\bzeros\s*\(|\bones\s*\(/.test(code)) matPts += 5;
    if (/\.\*|\.\/|\.\^/.test(code)) matPts += 4;
    if (matPts > 0) add('matlab', matPts);

    // گرووی (Groovy)
    var grvPts = 0;
    if (/\bdef\s+\w+\s*=/.test(code) && /\.each\s*\{/.test(code)) grvPts += 5;
    if (/pipeline\s*\{|stage\s*\(['"]/.test(code)) grvPts += 6;
    if (grvPts > 0) add('groovy', grvPts);

    // اف‌شارپ (F#)
    var fsPts = 0;
    if (/\bopen\s+System\b|\blet\s+rec\b/.test(code)) fsPts += 5;
    if (/\bmatch\s+\w+\s+with\s*\|\s*/.test(code)) fsPts += 5;
    if (/\bprintfn\b/.test(code)) fsPts += 5;
    if (fsPts > 0) add('fsharp', fsPts);

    // ویژوال بیسیک (VB)
    var vbPts = 0;
    if (/\b(?:Dim\s+\w+\s+As|End\s+Sub|Sub\s+Main|Module\s+\w+|End\s+Module)\b/i.test(code)) vbPts += 6;
    if (/\bConsole\.WriteLine\b/i.test(code) && /\bEnd\s+(?:Sub|Function)\b/i.test(code)) vbPts += 6;
    if (vbPts > 0) add('vb', vbPts);

    // اسمبلی (Assembly)
    var asmPts = 0;
    if (/\b(?:section\s+\.(?:text|data|bss)|global\s+_start|_start:)\b/i.test(code)) asmPts += 6;
    if (/\b(?:mov|push|pop|call|ret|syscall|int\s+0x80)\b/i.test(code) && /%?[er]?[abcd]x\b/i.test(code)) asmPts += 6;
    if (asmPts > 0) add('asm', asmPts);

    // اسکالا (Scala)
    var scaPts = 0;
    if (/\bobject\s+\w+\s+extends\s+App\b|\bcase\s+class\b/.test(code)) scaPts += 6;
    if (/\bval\s+\w+\s*[:=]/.test(code) && /\bimport\s+scala\./.test(code)) scaPts += 5;
    if (scaPts > 0) add('scala', scaPts);

    // پرل (Perl)
    var plPts = 0;
    if (/use\s+strict;|use\s+warnings;|\bmy\s+\$[\w]+/.test(code)) plPts += 6;
    if (/\bopen\s*\(\s*my\s+\$fh/.test(code)) plPts += 5;
    if (plPts > 0) add('perl', plPts);

    // آبجکتیو-سی (Objective-C)
    var objcPts = 0;
    if (/@interface\s+\w+|@implementation\s+\w+|@end\b/.test(code)) objcPts += 6;
    if (/NSLog\s*\(|\[\w+\s+\w+\]/.test(code)) objcPts += 5;
    if (objcPts > 0) add('objectivec', objcPts);

    // انتخاب زبانی با بالاترین امتیاز با حداقل آستانه ۲ امتیاز
    var bestLang = 'text', maxScore = 0;
    for (var k in scores) {
      if (scores[k] > maxScore) {
        maxScore = scores[k];
        bestLang = k;
      }
    }

    return maxScore >= 2 ? bestLang : 'text';
  }

  /* تعداد کلیدواژه‌های واقعی زبان در متن (برای موتور بررسی سخت‌گیر) */
  function keywordCount(code, langKey) {
    var spec = SPECS[langKey];
    if (!spec || !code) return 0;
    if (spec._kwRe === undefined) {
      spec._kwRe = null;
      for (var i = 0; i < spec.toks.length; i++) {
        if (spec.toks[i][0] === 'c-kw') {
          try { spec._kwRe = new RegExp(spec.toks[i][1], spec.flag || 'g'); }
          catch (e) { spec._kwRe = null; }
          break;
        }
      }
    }
    if (!spec._kwRe) return 0;
    var m = code.match(spec._kwRe);
    return m ? m.length : 0;
  }

  /* ── اجرای توکنایز ── */
  const cache = {};
  function buildRegex(spec) {
    if (!spec._re) {
      if (!spec.toks.length) { spec._re = null; return null; }
      var parts = [];
      for (var i = 0; i < spec.toks.length; i++) parts.push('(' + spec.toks[i][1] + ')');
      try { spec._re = new RegExp(parts.join('|'), spec.flag || 'g'); }
      catch (e) { spec._re = null; }
    }
    return spec._re;
  }

  function highlight(code, langKey) {
    if (!code) return '';
    if (code.length > 160000) return esc(code);
    var spec = SPECS[langKey] || SPECS.text;
    var re = buildRegex(spec);
    if (!re) return esc(code);
    var out = '', last = 0, m;
    re.lastIndex = 0;
    while ((m = re.exec(code)) !== null) {
      if (m[0].length === 0) { re.lastIndex++; continue; }
      if (m.index > last) out += esc(code.slice(last, m.index));
      var cls = 'c-op';
      for (var i = 1; i < m.length; i++) {
        if (m[i] !== undefined) { cls = spec.toks[i - 1][0]; break; }
      }
      out += '<span class="tk-' + cls + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    out += esc(code.slice(last));
    return out;
  }

  /* ── متادیتا ── */
  const LANGS = {
    swift:      { label: 'سوییفت',       ext: 'swift', color: '#F05138', file: 'main.swift' },
    python:     { label: 'پایتون',        ext: 'py',    color: '#3572A5', file: 'main.py' },
    javascript: { label: 'جاوااسکریپت',   ext: 'js',    color: '#f1e05a', file: 'index.js' },
    typescript: { label: 'تایپ‌اسکریپت',  ext: 'ts',    color: '#3178c6', file: 'index.ts' },
    java:       { label: 'جاوا',          ext: 'java',  color: '#b07219', file: 'Main.java' },
    c:          { label: 'سی',            ext: 'c',     color: '#9babca', file: 'main.c' },
    cpp:        { label: 'سی‌پلاس‌پلاس',  ext: 'cpp',   color: '#f34b7d', file: 'main.cpp' },
    csharp:     { label: 'سی‌شارپ',       ext: 'cs',    color: '#178600', file: 'Program.cs' },
    go:         { label: 'گو',            ext: 'go',    color: '#00ADD8', file: 'main.go' },
    rust:       { label: 'راست',          ext: 'rs',    color: '#dea584', file: 'main.rs' },
    php:        { label: 'پی‌اچ‌پی',      ext: 'php',   color: '#4F5D95', file: 'index.php' },
    ruby:       { label: 'روبی',          ext: 'rb',    color: '#701516', file: 'main.rb' },
    kotlin:     { label: 'کاتلین',        ext: 'kt',    color: '#A97BFF', file: 'Main.kt' },
    dart:       { label: 'دارت',          ext: 'dart',  color: '#00B4AB', file: 'main.dart' },
    html:       { label: 'اچ‌تی‌ام‌ال',   ext: 'html',  color: '#e34c26', file: 'index.html' },
    css:        { label: 'سی‌اس‌اس',      ext: 'css',   color: '#563d7c', file: 'style.css' },
    sql:        { label: 'اس‌کیو‌ال',     ext: 'sql',   color: '#e38c00', file: 'query.sql' },
    json:       { label: 'جیسون',         ext: 'json',  color: '#cbcb41', file: 'data.json' },
    bash:       { label: 'بش',            ext: 'sh',    color: '#89e051', file: 'script.sh' },
    objectivec: { label: 'آبجکتیو-سی', ext: 'm',       color: '#438eff', file: 'main.m' },
    scala:      { label: 'اسکالا',       ext: 'scala', color: '#c22d40', file: 'Main.scala' },
    perl:       { label: 'پرل',          ext: 'pl',    color: '#0298c3', file: 'script.pl' },
    lua:        { label: 'لوآ',          ext: 'lua',   color: '#5c7fbf', file: 'main.lua' },
    r:          { label: 'آر',           ext: 'r',     color: '#198CE7', file: 'script.R' },
    julia:      { label: 'جولیا',        ext: 'jl',    color: '#a270ba', file: 'main.jl' },
    haskell:    { label: 'هسکل',         ext: 'hs',    color: '#8f7dff', file: 'Main.hs' },
    elixir:     { label: 'الکسیر',       ext: 'ex',    color: '#a074c4', file: 'lib.ex' },
    matlab:     { label: 'متلب',         ext: 'm',     color: '#e16737', file: 'main.m' },
    groovy:     { label: 'گرووی',        ext: 'groovy',color: '#4298b8', file: 'Main.groovy' },
    fsharp:     { label: 'اف‌شارپ',      ext: 'fs',    color: '#378BBA', file: 'Program.fs' },
    vb:         { label: 'ویژوال بیسیک', ext: 'vb',    color: '#945db7', file: 'Module1.vb' },
    pascal:     { label: 'پاسکال',       ext: 'pas',   color: '#6d9cc4', file: 'main.pas' },
    solidity:   { label: 'سالیدیتی',     ext: 'sol',   color: '#9aa7bd', file: 'Contract.sol' },
    asm:        { label: 'اسمبلی',       ext: 'asm',   color: '#b0916a', file: 'main.asm' },
    text:       { label: 'متنی',          ext: 'txt',   color: '#8e8e93', file: 'untitled.txt' }
  };

  return {
    highlight: highlight,
    detect: detect,
    keywordCount: keywordCount,
    LANGS: LANGS,
    esc: esc
  };
})();

# Phase 2: Collection Nesting + Swagger Import

## Task 4: Recursive Collection Tree Component

**Files:**
- Create: `src/modules/api-tester/components/CollectionTree.tsx`
- Modify: `src/modules/api-tester/store.ts` (add nested collection helpers)
- Modify: `src/modules/api-tester/ApiTester.tsx` (use new tree component)

**Step 1: Add helper to store for building tree structure**

Add to `store.ts` interface and implementation:
```typescript
// In the store interface, add:
getCollectionTree: () => CollectionTreeNode[];

// Types
interface CollectionTreeNode {
  collection: Collection;
  children: CollectionTreeNode[];
  requests: Request[];
  depth: number;
}
```

Implementation: build tree from flat `collections` array using `parent_id`, cap at depth 3.

**Step 2: Create CollectionTree component**

```tsx
// src/modules/api-tester/components/CollectionTree.tsx
// Recursive tree component that renders:
// - Collection folders (expandable, max 3 levels)
// - Requests under each collection
// - Right-click context menu: New subfolder, New request, Rename, Delete
// - Visual indentation per depth level
// - Drag request into folder (optional, can be phase 2)

interface Props {
  onOpenRequest: (req: Request) => void;
  onContextMenu: (e: React.MouseEvent, type: 'collection' | 'request', id: number) => void;
}

function CollectionNode({ node, onOpenRequest, onContextMenu, collapsedSet, toggleCollapse }: {
  node: CollectionTreeNode;
  // ... props
}) {
  return (
    <div>
      <div className="tree-item collection-item" style={{ paddingLeft: 16 + node.depth * 16 }}
        onContextMenu={e => node.collection.id && onContextMenu(e, 'collection', node.collection.id)}>
        <span className="collapse-icon" onClick={() => toggleCollapse(node.collection.id!)}>▶</span>
        {/* folder icon */}
        <span className="name">{node.collection.name}</span>
        <span className="count">{node.requests.length}</span>
      </div>
      {/* Render child collections recursively */}
      {node.children.map(child => (
        <CollectionNode key={child.collection.id} node={child} ... />
      ))}
      {/* Render requests */}
      {node.requests.map(req => (
        <div key={req.id} className="tree-item" style={{ paddingLeft: 32 + node.depth * 16 }}
          onClick={() => onOpenRequest(req)}>
          <span className="method">{req.method}</span>
          <span className="name">{req.name}</span>
        </div>
      ))}
    </div>
  );
}
```

**Step 3: Update context menu to support "New Subfolder"**

Add "New Subfolder" option when right-clicking a collection (only if depth < 3):
```typescript
// In context menu handler, when type === 'collection':
// Check depth of clicked collection
// If depth < 3, show "New Subfolder" option
// On click: store.createCollection(name, parentId)
```

**Step 4: Replace inline sidebar tree in ApiTester.tsx with CollectionTree**

Remove the inline collection rendering code from ApiTester.tsx, replace with:
```tsx
<CollectionTree onOpenRequest={openRequestInTab} onContextMenu={handleContextMenu} />
```

**Step 5: Commit**
```bash
git add -A && git commit -m "feat(api-tester): add nested collection tree (max 3 levels)"
```

---

## Task 5: Enhance OpenAPI Parser + YAML Support

**Files:**
- Modify: `src/modules/api-tester/utils/openapi.ts`
- Modify: `package.json` (add js-yaml)

**Step 1: Install js-yaml**
```bash
npm install js-yaml && npm install -D @types/js-yaml
```

**Step 2: Enhance parseOpenAPI**

```typescript
import yaml from 'js-yaml';

export function parseOpenAPI(content: string): ParsedCollection {
  let spec: any;
  try {
    spec = JSON.parse(content);
  } catch {
    spec = yaml.load(content); // YAML fallback
  }

  const isV3 = spec.openapi?.startsWith('3.');
  const title = spec.info?.title || 'Imported API';

  // Build baseUrl
  let baseUrl = '';
  if (isV3) {
    baseUrl = spec.servers?.[0]?.url || '';
  } else {
    const scheme = spec.schemes?.[0] || 'https';
    const host = spec.host || '';
    const basePath = spec.basePath || '';
    baseUrl = host ? `${scheme}://${host}${basePath}` : basePath;
  }

  // $ref resolver
  function resolveRef(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (obj.$ref) {
      const path = obj.$ref.replace('#/', '').split('/');
      let resolved = spec;
      for (const p of path) resolved = resolved?.[p];
      return resolveRef(resolved);
    }
    if (Array.isArray(obj)) return obj.map(resolveRef);
    const result: any = {};
    for (const [k, v] of Object.entries(obj)) result[k] = resolveRef(v);
    return result;
  }

  // Generate example body from schema
  function generateExample(schema: any): any {
    if (!schema) return undefined;
    schema = resolveRef(schema);
    if (schema.example !== undefined) return schema.example;
    if (schema.type === 'object') {
      const obj: any = {};
      for (const [k, v] of Object.entries(schema.properties || {})) {
        obj[k] = generateExample(v as any);
      }
      return obj;
    }
    if (schema.type === 'array') return [generateExample(schema.items)];
    if (schema.type === 'string') return schema.enum?.[0] || 'string';
    if (schema.type === 'integer' || schema.type === 'number') return 0;
    if (schema.type === 'boolean') return false;
    return null;
  }

  // ... rest of parsing logic, using baseUrl for full URLs
  // and generateExample for request bodies
}
```

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(api-tester): enhance OpenAPI parser with YAML, \$ref, example generation"
```

---

## Task 6: Swagger URL Import

**Files:**
- Modify: `src/modules/api-tester/components/ImportApiModal.tsx`
- Modify: `src-tauri/src/http/mod.rs` (add generic fetch command if needed)

**Step 1: Add URL import tab to ImportApiModal**

Add a tab toggle at top: "Paste JSON" | "Upload File" | "From URL"

For "From URL" tab:
```tsx
const [swaggerUrl, setSwaggerUrl] = useState('');
const [fetching, setFetching] = useState(false);

const handleFetchUrl = async () => {
  setFetching(true);
  setError('');
  try {
    // Use Tauri to fetch (avoids CORS)
    const resp = await invoke<{ body: string }>('send_http_request', {
      method: 'GET', url: swaggerUrl, headers: {}, body: null
    });
    setContent(resp.body);
    handleParse(); // auto-parse after fetch
  } catch (e: any) {
    setError(e.message || 'Failed to fetch');
  } finally {
    setFetching(false);
  }
};
```

UI:
```tsx
{importMode === 'url' && (
  <div className="url-import">
    <input
      className="url-input"
      placeholder="https://petstore.swagger.io/v2/swagger.json"
      value={swaggerUrl}
      onChange={e => setSwaggerUrl(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && handleFetchUrl()}
    />
    <button onClick={handleFetchUrl} disabled={fetching || !swaggerUrl}>
      {fetching ? 'Fetching...' : 'Fetch & Parse'}
    </button>
  </div>
)}
```

**Step 2: Auto-parse after fetch**

After setting content from URL fetch, automatically call `handleParse()` to show preview.

**Step 3: Commit**
```bash
git add -A && git commit -m "feat(api-tester): add Swagger URL import"
```

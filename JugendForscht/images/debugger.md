```mermaid
flowchart TD
    Editor(Editor) <--DAP--> DA
    DA(Debug Adapter) <--Server spezifisch--> DS
    DS(Debug Server)
```
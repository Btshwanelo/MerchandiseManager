#!/bin/bash
sed -i '726s/\$\({item\.price\.toFixed(2)}\)/R\1/' client/src/pages/work-item-detail.tsx
sed -i '771s/\$\({item\.price\.toFixed(2)}\)/R\1/' client/src/pages/work-item-detail.tsx

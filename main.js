const THREE = window.AFRAME && window.AFRAME.THREE ? window.AFRAME.THREE : window.THREE;
const GHOST_SCALE = 3.0;

AFRAME.registerComponent('hover-highlight', {
    schema: {
        color: { type: 'color', default: '#ffffaa' },
        emissiveIntensity: { type: 'number', default: 0.45 },
        lightenAmount: { type: 'number', default: 0.18 }
    },
    init() {
        this._onEnter = this.onEnter.bind(this);
        this._onLeave = this.onLeave.bind(this);
        // Support both cursor mouseenter/leave and raycaster intersect events
        this.el.addEventListener('mouseenter', this._onEnter);
        this.el.addEventListener('mouseleave', this._onLeave);
        this.el.addEventListener('raycaster-intersected', this._onEnter);
        this.el.addEventListener('raycaster-intersected-cleared', this._onLeave);
    },
    remove() {
        this.el.removeEventListener('mouseenter', this._onEnter);
        this.el.removeEventListener('mouseleave', this._onLeave);
        this.restore();
    },
    onEnter() {
        const obj = this.el.getObject3D('mesh');
        if (!obj) return;
        const toProcess = [];
        if (obj.isMesh) toProcess.push(obj);
        else obj.traverse(c => { if (c.isMesh) toProcess.push(c); });
        toProcess.forEach(mesh => {
            if (!mesh.userData) mesh.userData = {};
            if (mesh.userData._hoverOriginalMaterial) return;
            const origMat = mesh.material;
            mesh.userData._hoverOriginalMaterial = origMat;
            const cloneMat = (m) => (m && m.clone ? m.clone() : m);
            if (Array.isArray(origMat)) {
                const clonedArray = origMat.map(cloneMat);
                mesh.material = clonedArray;
                clonedArray.forEach(cm => {
                    if (!cm) return;
                    if ('emissive' in cm) {
                        cm.emissive.set(this.data.color);
                        if ('emissiveIntensity' in cm) cm.emissiveIntensity = this.data.emissiveIntensity;
                    } else if ('color' in cm) {
                        try { cm.color.offsetHSL(0, 0, this.data.lightenAmount); } catch (e) {}
                    }
                });
            } else {
                const cloned = cloneMat(origMat);
                mesh.material = cloned;
                if (cloned && 'emissive' in cloned) {
                    cloned.emissive.set(this.data.color);
                    if ('emissiveIntensity' in cloned) cloned.emissiveIntensity = this.data.emissiveIntensity;
                } else if (cloned && 'color' in cloned) {
                    try { cloned.color.offsetHSL(0, 0, this.data.lightenAmount); } catch (e) {}
                }
            }
        });
    },
    onLeave() {
        this.restore();
    },
    restore() {
        const obj = this.el.getObject3D('mesh');
        if (!obj) return;
        const toProcess = [];
        if (obj.isMesh) toProcess.push(obj);
        else obj.traverse(c => { if (c.isMesh) toProcess.push(c); });
        toProcess.forEach(mesh => {
            const orig = mesh.userData && mesh.userData._hoverOriginalMaterial;
            if (!orig) return;
            const current = mesh.material;
            const disposeOne = (m) => { if (m && m.dispose) try { m.dispose(); } catch (e) {} };
            if (Array.isArray(current)) current.forEach(disposeOne); else disposeOne(current);
            mesh.material = orig;
            delete mesh.userData._hoverOriginalMaterial;
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Normalize asset base to ensure correct paths on subpaths and different hosts
    const pagePath = window.location.pathname || '/';
    const basePath = pagePath.endsWith('/') ? pagePath : pagePath.substring(0, pagePath.lastIndexOf('/') + 1);
    const assetBase = `${basePath}assets/`;
    const setAssetSrcIfPresent = (selector, file) => {
        const el = document.querySelector(selector);
        if (el) el.setAttribute('src', `${assetBase}${file}`);
    };
    setAssetSrcIfPresent('a-asset-item#room', 'room.glb');
    setAssetSrcIfPresent('a-asset-item#ghost', 'ghost.glb');
    console.log('A-Frame VR Project loaded successfully!');
    const box = document.querySelector('a-box');
    if (box) {
        box.addEventListener('click', () => {
            console.log('Box clicked!');
            box.setAttribute('color', '#FF6B6B');
        });
    }

    const sceneEl = document.querySelector('a-scene');
    const cameraEl = document.querySelector('a-camera');

    const roomEntity = document.getElementById('roomEntity');
    if (roomEntity) {
        const onModelLoaded = (e) => {
            if (roomEntity.getAttribute('data-split') === 'true') {
                console.log('[GLB Split] Already split. Skipping.');
                return;
            }
            const modelRoot = e.detail && e.detail.model ? e.detail.model : roomEntity.getObject3D('mesh');
            if (!modelRoot) return;

            const meshes = [];
            modelRoot.traverse((obj) => {
                if (obj.isMesh) meshes.push(obj);
            });

            console.log('[GLB Split] Found meshes:', meshes.length);
            if (meshes.length === 0) {
                console.warn('[GLB Split] No meshes found in model.');
                return;
            }
            if (meshes.length === 1 && meshes[0].geometry && meshes[0].geometry.groups && meshes[0].geometry.groups.length > 1) {
                console.log('[GLB Split] Single mesh with material groups:', meshes[0].geometry.groups.length, '- exporter may have merged objects.');
            }

            const tempPos = new THREE.Vector3();
            const tempQuat = new THREE.Quaternion();
            const tempScale = new THREE.Vector3();

            let createdCount = 0;
            const createdParts = [];
            meshes.forEach((mesh, idx) => {
                mesh.updateWorldMatrix(true, false);
                mesh.matrixWorld.decompose(tempPos, tempQuat, tempScale);

                const partEl = document.createElement('a-entity');
                const meshName = (mesh.name || '').toLowerCase();
                const isWall = meshName === 'wall' || meshName.includes('wall');
                if (!isWall) partEl.classList.add('selectable');
                partEl.setAttribute('position', `${tempPos.x} ${tempPos.y} ${tempPos.z}`);
                const euler = new THREE.Euler().setFromQuaternion(tempQuat, 'YXZ');
                const deg = {
                    x: THREE.MathUtils.radToDeg(euler.x),
                    y: THREE.MathUtils.radToDeg(euler.y),
                    z: THREE.MathUtils.radToDeg(euler.z)
                };
                partEl.setAttribute('rotation', `${deg.x} ${deg.y} ${deg.z}`);
                partEl.setAttribute('scale', `${tempScale.x} ${tempScale.y} ${tempScale.z}`);

                const meshClone = mesh.clone();
                meshClone.position.set(0, 0, 0);
                meshClone.quaternion.set(0, 0, 0, 1);
                meshClone.scale.set(1, 1, 1);
                meshClone.updateMatrixWorld(true);
                partEl.setObject3D('mesh', meshClone);

                if (!isWall) partEl.setAttribute('hover-highlight', '');
                roomEntity.sceneEl.appendChild(partEl);
                createdCount++;
                if (!isWall) createdParts.push(partEl);
            });

            console.log('[GLB Split] Created entities:', createdCount);
            if (createdCount > 0) {
                roomEntity.setAttribute('visible', 'false');
                roomEntity.setAttribute('data-split', 'true');
                const cam = document.querySelector('a-camera');
                const rc = cam && cam.components && cam.components.raycaster;
                if (rc && rc.refreshObjects) rc.refreshObjects();

                const fakeIdx = Math.floor(Math.random() * createdParts.length);
                const fakeEl = createdParts[fakeIdx];
                if (fakeEl) {
                    fakeEl.setAttribute('data-fake', 'true');
                    const onFakeClick = (e) => {
                        if (e && e.stopPropagation) e.stopPropagation();
                        if (fakeEl.getAttribute('data-fake-handled') === 'true') return;
                        fakeEl.setAttribute('data-fake-handled', 'true');

                        const worldPos = new THREE.Vector3();
                        const worldQuat = new THREE.Quaternion();
                        const worldScale = new THREE.Vector3();
                        fakeEl.object3D.updateWorldMatrix(true, false);
                        fakeEl.object3D.matrixWorld.decompose(worldPos, worldQuat, worldScale);

                        fakeEl.setAttribute('visible', 'false');

                        const ghost = document.createElement('a-entity');
                        ghost.setAttribute('gltf-model', '#ghost');
                        ghost.setAttribute('position', `${worldPos.x} ${worldPos.y} ${worldPos.z}`);
                        ghost.setAttribute('scale', `${GHOST_SCALE} ${GHOST_SCALE} ${GHOST_SCALE}`);

                        const euler = new THREE.Euler().setFromQuaternion(worldQuat, 'YXZ');
                        const deg = {
                            x: THREE.MathUtils.radToDeg(euler.x),
                            y: THREE.MathUtils.radToDeg(euler.y),
                            z: THREE.MathUtils.radToDeg(euler.z)
                        };
                        ghost.setAttribute('rotation', `0 90 0`);

                        const riseTo = `${worldPos.x} ${worldPos.y + 2} ${worldPos.z}`;
                        ghost.setAttribute('animation__rise', `property: position; to: ${riseTo}; dur: 3000; easing: linear`);

                        roomEntity.sceneEl.appendChild(ghost);

                        setTimeout(() => {
                            if (ghost.parentElement) ghost.parentElement.removeChild(ghost);
                        }, 3000);
                    };
                    fakeEl.addEventListener('click', onFakeClick, { once: true });
                }
            } else {
                console.warn('[GLB Split] No parts created; leaving original visible.');
            }
        };

        if (roomEntity.hasLoaded) {
            const existing = roomEntity.getObject3D('mesh');
            if (existing) {
                onModelLoaded({ detail: { model: existing } });
            } else {
                roomEntity.addEventListener('model-loaded', onModelLoaded, { once: true });
            }
        } else {
            roomEntity.addEventListener('loaded', () => {
                const existing = roomEntity.getObject3D('mesh');
                if (existing) {
                    onModelLoaded({ detail: { model: existing } });
                } else {
                    roomEntity.addEventListener('model-loaded', onModelLoaded, { once: true });
                }
            }, { once: true });
        }
    }

    if (cameraEl && roomEntity) {
        let selectedMesh = null;
        let hoveredMesh = null; 

        const clearSelection = () => {
            if (!selectedMesh) return;
            const originalMaterial = selectedMesh.userData && selectedMesh.userData.originalMaterial;
            if (originalMaterial) {
                if (selectedMesh.material && selectedMesh.material !== originalMaterial) {
                    if (selectedMesh.material.dispose) selectedMesh.material.dispose();
                }
                selectedMesh.material = originalMaterial;
                delete selectedMesh.userData.originalMaterial;
            }
            selectedMesh = null;
        };

        const highlightMesh = (mesh) => {
            if (!mesh || mesh === selectedMesh) return;
            clearSelection();
            mesh.userData = mesh.userData || {};
            mesh.userData.originalMaterial = mesh.material;
            mesh.material = mesh.material.clone();
            if ('emissive' in mesh.material) {
                mesh.material.emissive.set('#ffff00');
                if ('emissiveIntensity' in mesh.material) mesh.material.emissiveIntensity = 1.0;
            } else if ('color' in mesh.material) {
                mesh.material.color.set('#ffff00');
            }
            selectedMesh = mesh;
        };

        const getFirstMeshIntersection = () => {
            const raycasterComp = cameraEl.components && cameraEl.components.raycaster;
            if (!raycasterComp) return null;
            const intersections = raycasterComp.intersections || [];
            if (!intersections.length) return null;
            return intersections.find(i => i.object && i.object.isMesh) || null;
        };

        const canvas = document.querySelector('a-scene')?.canvas;
        if (canvas) {
            canvas.addEventListener('click', () => {
                const first = getFirstMeshIntersection();
                if (first && first.object) {
                    highlightMesh(first.object);
                } else {
                    clearSelection();
                }
            });
        }

    }

    const bookEl = document.getElementById('bookEntity');
    if (bookEl) {
        bookEl.addEventListener('model-error', (e) => {
            console.error('[Book] model-error:', e && e.detail ? e.detail : e);
        });
        const onBookLoaded = (e) => {
            try {
                const obj = e.detail && e.detail.model ? e.detail.model : bookEl.getObject3D('mesh');
                console.log('[Book] model-loaded. Object present:', !!obj);
                if (!obj) return;

                const bbox = new THREE.Box3().setFromObject(obj);
                const size = new THREE.Vector3();
                const center = new THREE.Vector3();
                bbox.getSize(size);
                bbox.getCenter(center);
                console.log('[Book] bbox size:', size.x.toFixed(3), size.y.toFixed(3), size.z.toFixed(3));

                obj.position.sub(center);
                obj.updateMatrixWorld(true);

                const maxDim = Math.max(size.x || 1, size.y || 1, size.z || 1);
                const target = 1.0;
                const factor = maxDim > 0 ? (target / maxDim) : 1;
                bookEl.setAttribute('scale', `${factor} ${factor} ${factor}`);

                const camEl = document.querySelector('a-camera');
                if (camEl && camEl.object3D) {
                    const camObj = camEl.object3D;
                    const camPos = new THREE.Vector3();
                    camObj.getWorldPosition(camPos);
                    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camObj.quaternion).normalize();
                    const place = camPos.clone().add(forward.multiplyScalar(2));
                    bookEl.object3D.position.copy(place);
                } else {
                    bookEl.setAttribute('position', '0 0 -2');
                }

                bookEl.setAttribute('visible', 'true');
                const cam = document.querySelector('a-camera');
                const rc = cam && cam.components && cam.components.raycaster;
                if (rc && rc.refreshObjects) rc.refreshObjects();
            } catch (err) {
                console.error('[Book] post-load handling error:', err);
            }
        };

        if (bookEl.hasLoaded) {
            const existing = bookEl.getObject3D('mesh');
            if (existing) onBookLoaded({ detail: { model: existing } });
            else bookEl.addEventListener('model-loaded', onBookLoaded, { once: true });
        } else {
            bookEl.addEventListener('loaded', () => {
                const existing = bookEl.getObject3D('mesh');
                if (existing) onBookLoaded({ detail: { model: existing } });
                else bookEl.addEventListener('model-loaded', onBookLoaded, { once: true });
            }, { once: true });
        }
    }
});
// dd
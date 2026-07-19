let colaCapturasOffline = [];
let historialLocalPila = [];
let miGraficoCacao = null;

document.addEventListener("DOMContentLoaded", function () {
    const ctx = document.getElementById('chartCacao');
    if (ctx) {
        window.miGraficoCacao = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Sanas', 'Alertas'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#00ff88', '#f97316'],
                    borderColor: '#16191f',
                    borderWidth: 3,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } }
                    }
                }
            }
        });
    }

    const offlineGuardado = localStorage.getItem('sys_offline') === 'true';
    if(document.getElementById('config-modo-offline')) {
        document.getElementById('config-modo-offline').checked = offlineGuardado;
    }
    
    const calGuardada = localStorage.getItem('cfg_calidad') || '224px';
    if(document.getElementById('config-calidad-imagen')) {
        document.getElementById('config-calidad-imagen').value = calGuardada;
    }

    const fotosGuardadas = localStorage.getItem('cfg_fotos') !== 'false';
    const chkGuardarFotos = document.getElementById('config-guardar-fotos');
    if(chkGuardarFotos) {
        chkGuardarFotos.checked = fotosGuardadas;
        chkGuardarFotos.addEventListener('change', function() {
            localStorage.setItem('cfg_fotos', this.checked);
        });
    }

    const btnBorrar = document.getElementById('btn-borrar-historial');
    if (btnBorrar) {
        btnBorrar.addEventListener('click', function() {
            const seguro = confirm("⚠️ ¿Estás seguro de que deseas eliminar todo el historial? Esto vaciará los registros del servidor y la pantalla.");
            if (seguro) {
                fetch('/borrar_historial', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if(data.message) {
                        historialLocalPila = [];
                        colaCapturasOffline = [];
                        
                        if(document.getElementById('m-total')) document.getElementById('m-total').innerText = "0";
                        if(document.getElementById('m-alertas')) document.getElementById('m-alertas').innerText = "0";
                        if(document.getElementById('m-sanos')) document.getElementById('m-sanos').innerText = "0";
                        
                        if (window.miGraficoCacao) {
                            window.miGraficoCacao.data.datasets[0].data = [0, 0];
                            window.miGraficoCacao.update();
                        }
                        
                        const tbody = document.getElementById('table-history-body');
                        if (tbody) {
                            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted);">No se encontraron registros.</td></tr>`;
                        }
                        alert("¡Historial borrado con éxito!");
                    } else {
                        alert("Error: " + data.error);
                    }
                })
                .catch(err => console.error("Fallo de conexión en purga:", err));
            }
        });
    }
});

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar-ui');
    if (sidebar) sidebar.classList.toggle('collapsed');
}

function mostrarVista(vista) {
    const vistas = ['inicio', 'historial', 'perfil', 'configuracion'];
    
    vistas.forEach(v => {
        const elView = document.getElementById(`vista-${v}`);
        const elMenu = document.getElementById(`menu-${v}`);
        if (elView) elView.classList.add('display-none');
        if (elMenu) elMenu.classList.remove('active');
    });
    
    const currentView = document.getElementById(`vista-${vista}`);
    const currentMenu = document.getElementById(`menu-${vista}`);
    if (currentView) currentView.classList.remove('display-none');
    if (currentMenu) currentMenu.classList.add('active');
    
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar-ui');
        if (sidebar) sidebar.classList.add('collapsed');
    }
    if (vista === 'historial') {
        ejecutarBusquedaSecuencial();
    }
}

function cambiarModoOffline(valorChecked) {
    localStorage.setItem('sys_offline', valorChecked);
    alert(valorChecked ? "Modo Offline Activado con éxito." : "Modo En Línea Restablecido.");
}

function guardarPreferenciaLocal(clave, valor) {
    localStorage.setItem(clave, valor);
}

function procesarArchivoSubido() {
    const input = document.getElementById('file-input');
    if (!input.files || input.files.length === 0) return;

    const archivoReal = input.files[0];
    const modoOffline = localStorage.getItem('sys_offline') === 'true';
    
    const cfgCalidad = localStorage.getItem('cfg_calidad') || '224px';
    const resolucionMapeada = cfgCalidad === '128px' ? "128 x 128 px" : (cfgCalidad === '299px' ? "299 x 299 px" : "224 x 224 px");

    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('img-preview').src = e.target.result;
    }
    reader.readAsDataURL(archivoReal);

    const laser = document.getElementById('laser-scanner');
    if (laser) laser.style.display = 'block';

    document.getElementById('panel-resultados').classList.add('display-none');
    document.getElementById('loading-indicator').classList.remove('display-none');

    setTimeout(() => {
        if (modoOffline) {
            const capturaSimulada = {
                id: historialLocalPila.length + colaCapturasOffline.length + 1,
                archivo: archivoReal.name,
                diagnostico: "Pudrición Negra - Phytophthora palmivora",
                confianza: 88,
                resolucion: resolucionMapeada,
                recomendaciones: [
                    "[OFFLINE] Retirar mazorcas infectadas inmediatamente.",
                    "[OFFLINE] Reducir densidad de sombra para bajar la humedad."
                ]
            };
            colaCapturasOffline.push(capturaSimulada);
            document.getElementById('loading-indicator').classList.add('display-none');
            actualizarPantalla(capturaSimulada);
        } else {
            const formData = new FormData();
            formData.append('file', archivoReal);
            formData.append('guardar_fotos', localStorage.getItem('cfg_fotos') !== 'false');

            fetch('/analizar', { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                document.getElementById('loading-indicator').classList.add('display-none');
                if (data.error) {
                    alert(data.error);
                    if (laser) laser.style.display = 'none';
                    return;
                }
                const ultimo = data.historial_completo[data.historial_completo.length - 1];
                const registroFormateado = {
                    id: ultimo.id,
                    archivo: ultimo.archivo,
                    diagnostico: data.diagnostico,
                    confianza: data.confianza,
                    resolucion: resolucionMapeada,
                    recomendaciones: data.recomendaciones
                };
                historialLocalPila.push(registroFormateado);
                actualizarPantalla(registroFormateado);
            })
            .catch(err => {
                document.getElementById('loading-indicator').classList.add('display-none');
                if (laser) laser.style.display = 'none';
                console.error("Error en inferencia:", err);
            });
        }
    }, 1500);
}

function actualizarPantalla(data) {
    const laser = document.getElementById('laser-scanner');
    if (laser) laser.style.display = 'none';

    document.getElementById('panel-resultados').classList.remove('display-none');
    document.getElementById('r-diagnostico').innerText = data.diagnostico;
    document.getElementById('r-confianza').innerText = `Confianza: ${data.confianza}%`;
    document.getElementById('r-resolucion').innerText = data.resolucion;
    document.getElementById('r-archivo-nombre').innerText = data.archivo;

    const fill = document.getElementById('progress-bar-fill');
    if (fill) {
        fill.style.width = `${data.confianza}%`;
        fill.style.backgroundColor = data.diagnostico.includes("Saludable") ? "#10b981" : "#f97316";
    }

    const conteoTotal = historialLocalPila.length + colaCapturasOffline.length;
    if(document.getElementById('m-total')) document.getElementById('m-total').innerText = conteoTotal;

    let alertas = 0, sanos = 0;
    [...historialLocalPila, ...colaCapturasOffline].forEach(item => {
        if(item.diagnostico.includes("Saludable")) sanos++;
        else alertas++;
    });
    if(document.getElementById('m-alertas')) document.getElementById('m-alertas').innerText = alertas;
    if(document.getElementById('m-sanos')) document.getElementById('m-sanos').innerText = sanos;

    if (window.miGraficoCacao) {
        window.miGraficoCacao.data.datasets[0].data = [sanos, alertas];
        window.miGraficoCacao.update();
    }

    const lista = document.getElementById('r-recomendaciones');
    if (lista) {
        lista.innerHTML = "";
        data.recomendaciones.forEach(rec => {
            const li = document.createElement('li');
            li.innerText = rec;
            lista.appendChild(li);
        });
    }
}

function ejecutarBusquedaSecuencial() {
    const valorBusqueda = document.getElementById('search-input').value;
    fetch(`/buscar?query=${encodeURIComponent(valorBusqueda)}`)
    .then(res => res.json())
    .then(data => renderizarTablaHistorial(data.resultados))
    .catch(err => console.error("Error en búsqueda:", err));
}

function renderizarTablaHistorial(listaCompleta) {
    const tbody = document.getElementById('table-history-body');
    if (!tbody) return;
    tbody.innerHTML = "";
    
    if (!listaCompleta || listaCompleta.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-muted);">No se encontraron registros.</td></tr>`;
        return;
    }

    listaCompleta.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.id}</strong></td>
            <td>${item.archivo}</td>
            <td><span class="badge-table">${item.diagnostico}</span></td>
            <td>${item.confianza}%</td>
            <td>${item.resolucion}</td>
        `;
        tbody.appendChild(tr);
    });
}

function ordenarHistorialBurbujaCliente() {
    let arreglo = historialLocalPila;
    let n = arreglo.length;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (arreglo[j].confianza < arreglo[j + 1].confianza) {
                let temp = arreglo[j];
                arreglo[j] = arreglo[j + 1];
                arreglo[j + 1] = temp;
            }
        }
    }
    alert("Historial ordenado por certeza.");
    ejecutarBusquedaSecuencial();
}

function descargarReportePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const diag = document.getElementById('r-diagnostico').innerText;
    const conf = document.getElementById('r-confianza').innerText;
    const nameArch = document.getElementById('r-archivo-nombre').innerText;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129);
    doc.text("CACAOSCAN - REPORTE GENERAL", 20, 20);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    doc.text(`Archivo Analizado: ${nameArch}`, 20, 40);
    doc.text(`Patología Detectada: ${diag}`, 20, 50);
    doc.text(`Certeza de IA: ${conf}`, 20, 60);

    let baseHeight = 80;
    doc.text("Medidas Correctivas:", 20, 70);
    document.querySelectorAll('#r-recomendaciones li').forEach(li => {
        doc.text(`* ${li.innerText}`, 20, baseHeight);
        baseHeight += 10;
    });
    doc.save(`Reporte_CacaoScan.pdf`);
}
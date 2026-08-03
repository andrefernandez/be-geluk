"use client";

import { useState, useMemo } from "react";
import { createOperation, deleteOperation, updateOperation } from "./actions";
import { NumericFormat } from 'react-number-format';

export default function OperationTable({ initialOperations, clients, currentUserRole, clientHistoryMaxRates, clientLastOperationRate, globalSettings }: { initialOperations: any[], clients: any[], currentUserRole: string, clientHistoryMaxRates?: Record<string, any>, clientLastOperationRate?: Record<string, { percentual: number, percentualAdValorem: number }>, globalSettings?: any }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [clientSearch, setClientSearch] = useState("");
    const [dateSearch, setDateSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [xmlWarning, setXmlWarning] = useState<{ name: string, cnpj: string } | null>(null);

    const filteredOperations = initialOperations.filter(op => {
        const matchesClient = op.client.name.toLowerCase().includes(clientSearch.toLowerCase());
        const matchesDate = dateSearch ? new Date(op.date).toISOString().split("T")[0] === dateSearch : true;
        return matchesClient && matchesDate;
    });

    const operations = filteredOperations;

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const isAdminOrManager = currentUserRole === "ADMIN" || currentUserRole === "MANAGER";

    const [formData, setFormData] = useState({
        clientId: "",
        date: new Date().toISOString().split("T")[0],
        valorBruto: "",
        fator: "",
        percentual: "",
        percentualPrazo: "",
        dias: "",
        tarifas: "",
        percentualTarifas: "",
        adValorem: "",
        percentualAdValorem: "",
        irpj: "",
        iof: "",
        percentualIof: "",
        iofAdicional: "",
        percentualIofAdicional: "",
        valorLiquido: "",
        recompra: "",
        declarada: true,
        sacados: [] as any[],
        tarifasList: globalSettings?.defaultTarifas && globalSettings.defaultTarifas.length > 0 ? globalSettings.defaultTarifas : [
            { id: '1', nome: "Entrada de título", valor: "85", active: false },
            { id: '2', nome: "Instrução bancária de título", valor: "10", active: false },
            { id: '3', nome: "Manutenção de título bancário", valor: "15", active: false },
            { id: '4', nome: "Tarifa de aditivo", valor: "10", active: false },
            { id: '5', nome: "Tarifa de cobrança e notificação", valor: "60", active: false },
            { id: '6', nome: "Tarifa de contrato", valor: "200", active: false }
        ] as any[]
    });

    // Auto-calculate valor liquido effect
    useMemo(() => {
        if (!formData.valorBruto) return;
        const bruto = parseFloat(formData.valorBruto) || 0;
        const f = parseFloat(formData.fator) || 0;
        const adv = parseFloat(formData.adValorem) || 0;
        const tar = parseFloat(formData.tarifas) || 0;
        const iof = parseFloat(formData.iof) || 0;
        const iofa = parseFloat(formData.iofAdicional) || 0;
        const irpj = parseFloat(formData.irpj) || 0;
        const rec = parseFloat(formData.recompra) || 0;
        const liq = bruto - f - adv - tar - iof - iofa - irpj - rec;
        
        const newLiqStr = liq.toFixed(2);
        if (formData.valorLiquido !== newLiqStr && !Number.isNaN(liq)) {
            setTimeout(() => setFormData(prev => ({ ...prev, valorLiquido: newLiqStr })), 0);
        }
    }, [formData.valorBruto, formData.fator, formData.adValorem, formData.tarifas, formData.iof, formData.iofAdicional, formData.irpj, formData.recompra, formData.valorLiquido]);

    const formatCurrency = (val: number | null) => {
        if (val === null || val === undefined) return "-";
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const formatPercent = (val: number | null) => {
        if (val === null || val === undefined) return "-";
        return `${val.toFixed(2)}%`;
    };

    const sumColumn = (key: keyof typeof operations[0], onlySelected = false) => {
        const opsToSum = onlySelected && selectedIds.size > 0
            ? operations.filter(op => selectedIds.has(op.id))
            : operations;
        return opsToSum.reduce((acc, op) => {
            const val = Number(op[key]) || 0;
            return acc + Math.round(val * 100);
        }, 0) / 100;
    };

    const calculateAverageDays = (onlySelected = false) => {
        const opsToCalc = onlySelected && selectedIds.size > 0 ? operations.filter(op => selectedIds.has(op.id)) : operations;
        const totalBruto = opsToCalc.reduce((acc, op) => acc + (Number(op.valorBruto) || 0), 0);
        if (totalBruto === 0) return 0;
        const weightedDays = opsToCalc.reduce((acc, op) => acc + ((Number(op.valorBruto) || 0) * (Number(op.dias) || 0)), 0);
        return weightedDays / totalBruto;
    };

    const calculateWeightedAveragePercent = (key: "percentual" | "percentualTarifas" | "percentualAdValorem", onlySelected = false) => {
        const opsToCalc = onlySelected && selectedIds.size > 0 ? operations.filter(op => selectedIds.has(op.id)) : operations;
        const totalBruto = opsToCalc.reduce((acc, op) => acc + (Number(op.valorBruto) || 0), 0);
        if (totalBruto === 0) return 0;
        const weightedPercent = opsToCalc.reduce((acc, op) => acc + ((Number(op.valorBruto) || 0) * (Number(op[key]) || 0)), 0);
        return weightedPercent / totalBruto;
    };

    const applyClientRates = (clientId: string, state: any, force = false) => {
        const c = clients.find(cl => cl.id === clientId);
        if (!c) return state;

        const maxH = clientHistoryMaxRates ? clientHistoryMaxRates[clientId] : null;

        const bruto = parseFloat(state.valorBruto) || 0;
        const dias = parseFloat(state.dias) || 0;
        const numSacados = state.sacados && state.sacados.length > 0 ? state.sacados.filter((s:any) => s.active !== false).length : 1;
        
        const dateObj = new Date(state.date);
        const daysInMonth = new Date(dateObj.getUTCFullYear(), dateObj.getUTCMonth() + 1, 0).getDate();

        // Fator
        const currentFRate = (!force && state.percentual) ? parseFloat(state.percentual) : null;
        const fRate = currentFRate !== null ? currentFRate : (c.taxaFator != null ? c.taxaFator : (maxH && maxH.f != null ? maxH.f : 8.5));
        let newFator = state.fator;
        let newPercentual = state.percentual;
        if (fRate != null) {
            const fVal = bruto * (fRate / 100 / 30) * dias;
            newFator = fVal > 0 ? fVal.toFixed(2) : "";
            newPercentual = fRate.toString();
        }

        // Ad Valorem
        const currentARate = (!force && state.percentualAdValorem) ? parseFloat(state.percentualAdValorem) : null;
        const aRate = currentARate !== null ? currentARate : (c.taxaAdValorem != null ? c.taxaAdValorem : (maxH && maxH.a != null ? maxH.a : 0));
        let newAdValorem = state.adValorem;
        let newPercentualAdValorem = state.percentualAdValorem;
        if (aRate != null) {
            const aVal = bruto * (aRate / 100);
            newAdValorem = aVal > 0 ? aVal.toFixed(2) : "";
            newPercentualAdValorem = aRate.toString();
        }

        // Tarifas
        const currentTRate = (!force && state.percentualTarifas) ? parseFloat(state.percentualTarifas) : null;
        const tRate = currentTRate !== null ? currentTRate : (maxH && maxH.t != null ? maxH.t : null);
        const tFixed = maxH && maxH.tFixed != null ? maxH.tFixed : c.taxaTarifa;
        let newTarifas = state.tarifas;
        let newPercentualTarifas = state.percentualTarifas;
        
        if (tRate != null) {
            const tVal = bruto * (tRate / 100);
            newTarifas = tVal > 0 ? tVal.toFixed(2) : "";
            newPercentualTarifas = tRate.toString();
        } else if (tFixed != null) {
            if (force || !state.tarifas) {
                const tVal = tFixed * numSacados;
                newTarifas = tVal > 0 ? tVal.toFixed(2) : "";
                newPercentualTarifas = bruto > 0 ? ((tVal / bruto) * 100).toString() : "";
            } else {
                // Keep current manual tarifas and update percentage
                const tVal = parseFloat(state.tarifas) || 0;
                newPercentualTarifas = bruto > 0 ? ((tVal / bruto) * 100).toString() : "";
            }
        }

        // IOF
        const currentIofRate = (!force && state.percentualIof) ? parseFloat(state.percentualIof) : null;
        const iofRate = currentIofRate !== null ? currentIofRate : (c.taxaIof != null ? c.taxaIof : null);
        let newIof = state.iof;
        let newPercentualIof = state.percentualIof;
        
        if (iofRate !== null) {
            const iofVal = bruto * (iofRate / 100);
            newIof = iofVal > 0 ? iofVal.toFixed(2) : "";
            newPercentualIof = iofRate.toString();
        } else if (maxH && maxH.iof != null) {
            newIof = maxH.iof.toString();
            if (bruto > 0) newPercentualIof = ((maxH.iof / bruto) * 100).toString();
        }

        // IOF Adicional
        const currentIofaRate = (!force && state.percentualIofAdicional) ? parseFloat(state.percentualIofAdicional) : null;
        const iofaRate = currentIofaRate !== null ? currentIofaRate : (c.taxaIofAdicional != null ? c.taxaIofAdicional : null);
        let newIofAdicional = state.iofAdicional;
        let newPercentualIofAdicional = state.percentualIofAdicional;

        if (iofaRate !== null) {
            const iofaVal = bruto * (iofaRate / 100);
            newIofAdicional = iofaVal > 0 ? iofaVal.toFixed(2) : "";
            newPercentualIofAdicional = iofaRate.toString();
        } else if (maxH && maxH.iofAdicional != null) {
            newIofAdicional = maxH.iofAdicional.toString();
            if (bruto > 0) newPercentualIofAdicional = ((maxH.iofAdicional / bruto) * 100).toString();
        }

        let newIrpj = state.irpj;
        if (force && maxH && maxH.irpj != null) newIrpj = maxH.irpj.toString();

        return {
            ...state,
            fator: newFator,
            percentual: newPercentual,
            adValorem: newAdValorem,
            percentualAdValorem: newPercentualAdValorem,
            tarifas: newTarifas,
            percentualTarifas: newPercentualTarifas,
            iof: newIof,
            percentualIof: newPercentualIof,
            iofAdicional: newIofAdicional,
            percentualIofAdicional: newPercentualIofAdicional,
            irpj: newIrpj
        };
    };


    const calculatePrazoMedio = (sacados: any[], referenceDate: string) => {
        const activeSacados = sacados.filter(s => s.active);
        if (!activeSacados.length) return "";
        
        // Parse date considering timezone safely as UTC or local noon to avoid midnight shift
        const refParts = referenceDate.split("-");
        if (refParts.length < 3) return "";
        const refD = new Date(Number(refParts[0]), Number(refParts[1]) - 1, Number(refParts[2]));
        
        let totalValXDays = 0;
        let totalBruto = 0;
        
        activeSacados.forEach(s => {
            let days = 1;
            if (s.vencimento) {
                const vencParts = s.vencimento.split("-");
                if (vencParts.length === 3) {
                    const vencD = new Date(Number(vencParts[0]), Number(vencParts[1]) - 1, Number(vencParts[2]));
                    const diffTime = vencD.getTime() - refD.getTime();
                    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    days = diffDays > 0 ? diffDays : 1;
                }
            }
            totalValXDays += ((Number(s.valor) || 0) * days);
            totalBruto += (Number(s.valor) || 0);
        });
        
        if (totalBruto === 0) return "";
        return Math.round(totalValXDays / totalBruto).toString();
    };

    const handleOpenModal = () => {
        setEditingId(null);
        setXmlWarning(null);
        let initialData = {
            clientId: clients.length > 0 ? clients[0].id : "",
            date: new Date().toISOString().split("T")[0],
            valorBruto: "", fator: "", percentual: "", percentualPrazo: "", dias: "",
            tarifas: "", percentualTarifas: "", adValorem: "", percentualAdValorem: "",
            irpj: "", iof: "", percentualIof: "", iofAdicional: "", percentualIofAdicional: "", valorLiquido: "", recompra: "", declarada: true, sacados: [],
            tarifasList: globalSettings?.defaultTarifas && globalSettings.defaultTarifas.length > 0 ? globalSettings.defaultTarifas : [
                { id: '1', nome: "Entrada de título", valor: "85", active: false },
                { id: '2', nome: "Instrução bancária de título", valor: "10", active: false },
                { id: '3', nome: "Manutenção de título bancário", valor: "15", active: false },
                { id: '4', nome: "Tarifa de aditivo", valor: "10", active: false },
                { id: '5', nome: "Tarifa de cobrança e notificação", valor: "60", active: false },
                { id: '6', nome: "Tarifa de contrato", valor: "200", active: false }
            ]
        };
        if (initialData.clientId) initialData = applyClientRates(initialData.clientId, initialData, true);
        
        setFormData(initialData);
        setIsModalOpen(true);
    };

    const handleEdit = (op: any) => {
        setEditingId(op.id);
        setXmlWarning(null);
        const dateStr = new Date(op.date).toISOString().split("T")[0];
        setFormData({
            clientId: op.clientId,
            date: dateStr,
            valorBruto: op.valorBruto?.toString() || "",
            fator: op.fator?.toString() || "",
            percentual: op.percentual?.toString() || "",
            percentualPrazo: op.percentualPrazo?.toString() || "",
            dias: op.dias?.toString() || "",
            tarifas: op.tarifas?.toString() || "",
            percentualTarifas: op.percentualTarifas?.toString() || "",
            adValorem: op.adValorem?.toString() || "",
            percentualAdValorem: op.percentualAdValorem?.toString() || "",
            irpj: op.irpj?.toString() || "",
            iof: op.iof?.toString() || "",
            percentualIof: op.iof && op.valorBruto ? ((op.iof / op.valorBruto) * 100).toString() : "",
            iofAdicional: op.iofAdicional?.toString() || "",
            percentualIofAdicional: op.iofAdicional && op.valorBruto ? ((op.iofAdicional / op.valorBruto) * 100).toString() : "",
            valorLiquido: op.valorLiquido?.toString() || "",
            recompra: op.recompra?.toString() || "",
            declarada: op.declarada ?? false,
            sacados: op.sacados.map((s:any) => ({...s, active: true})) || [],
            tarifasList: [
                { id: '1', nome: "Entrada de título", valor: "85", active: false },
                { id: '2', nome: "Instrução bancária de título", valor: "10", active: false },
                { id: '3', nome: "Manutenção de título bancário", valor: "15", active: false },
                { id: '4', nome: "Tarifa de aditivo", valor: "10", active: false },
                { id: '5', nome: "Tarifa de cobrança e notificação", valor: "60", active: false },
                { id: '6', nome: "Tarifa de contrato", valor: "200", active: false }
            ]
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.clientId) {
            alert("Selecione um cedente.");
            return;
        }
        setLoading(true);

        const activeSacados = formData.sacados.filter(s => s.active !== false).map(s => ({
            nome: s.nome,
            cnpj: s.cnpj,
            valor: s.valor,
            vencimento: s.vencimento // opcional
        }));

        const payload = {
            ...formData,
            date: new Date(formData.date),
            valorBruto: Number(formData.valorBruto),
            fator: Number(formData.fator),
            percentual: Number(formData.percentual),
            percentualPrazo: Number(formData.percentualPrazo),
            dias: Number(formData.dias),
            tarifas: Number(formData.tarifas),
            percentualTarifas: formData.percentualTarifas ? Number(formData.percentualTarifas) : null,
            adValorem: Number(formData.adValorem),
            percentualAdValorem: formData.percentualAdValorem ? Number(formData.percentualAdValorem) : null,
            irpj: formData.irpj ? Number(formData.irpj) : null,
            iof: formData.iof ? Number(formData.iof) : null,
            iofAdicional: formData.iofAdicional ? Number(formData.iofAdicional) : null,
            valorLiquido: Number(formData.valorLiquido),
            recompra: formData.recompra ? Number(formData.recompra) : null,
            declarada: formData.declarada,
            sacados: activeSacados,
        };

        if (editingId) {
            await updateOperation(editingId, payload);
        } else {
            await createOperation(payload);
        }
        window.location.reload();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir esta operação?")) {
            await deleteOperation(id);
            window.location.reload();
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        
        let extractedCedenteName = "";
        let extractedCedenteCnpj = "";
        let extractedSacados: any[] = [];

        Promise.all(files.map(file => {
            return new Promise<void>((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const xmlStr = event.target?.result as string;
                    if (!xmlStr) return resolve();
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlStr, "text/xml");
                    
                    const emit = xmlDoc.getElementsByTagName("emit")[0];
                    if (emit) {
                        const xNome = emit.getElementsByTagName("xNome")[0]?.textContent || "";
                        const cnpj = emit.getElementsByTagName("CNPJ")[0]?.textContent || "";
                        if (!extractedCedenteName) {
                            extractedCedenteName = xNome;
                            extractedCedenteCnpj = cnpj;
                        }
                    }
                    
                    const dest = xmlDoc.getElementsByTagName("dest")[0];
                    if (dest) {
                        const sacadoNome = dest.getElementsByTagName("xNome")[0]?.textContent || "";
                        const sacadoCnpj = dest.getElementsByTagName("CNPJ")[0]?.textContent || dest.getElementsByTagName("CPF")[0]?.textContent || "";
                        
                        const vNF = xmlDoc.getElementsByTagName("vNF")[0]?.textContent;
                        const defaultVal = vNF ? parseFloat(vNF) : 0;
                        
                        const cobr = xmlDoc.getElementsByTagName("cobr")[0];
                        let added = false;
                        if (cobr) {
                            const dups = cobr.getElementsByTagName("dup");
                            if (dups.length > 0) {
                                for (let i = 0; i < dups.length; i++) {
                                    const dVenc = dups[i].getElementsByTagName("dVenc")[0]?.textContent || "";
                                    const vDupStr = dups[i].getElementsByTagName("vDup")[0]?.textContent || "";
                                    const vDup = vDupStr ? parseFloat(vDupStr) : defaultVal;
                                    extractedSacados.push({
                                        id: Math.random().toString(36).substring(7),
                                        nome: sacadoNome,
                                        cnpj: sacadoCnpj,
                                        valor: vDup,
                                        vencimento: dVenc,
                                        active: true
                                    });
                                }
                                added = true;
                            }
                        }
                        
                        if (!added) {
                            extractedSacados.push({
                                id: Math.random().toString(36).substring(7),
                                nome: sacadoNome,
                                cnpj: sacadoCnpj,
                                valor: defaultVal,
                                vencimento: "",
                                active: true
                            });
                        }
                    }
                    resolve();
                };
                reader.readAsText(file);
            });
        })).then(() => {
            const cleanCnpj = extractedCedenteCnpj.replace(/\D/g, '');
            const matchedClient = clients.find(c => 
                (c.cnpj && c.cnpj.replace(/\D/g, '') === cleanCnpj) ||
                c.name.toLowerCase() === extractedCedenteName.toLowerCase() || 
                (extractedCedenteName && c.name.toLowerCase().includes(extractedCedenteName.toLowerCase()))
            );

            if (!matchedClient) {
                setXmlWarning({ name: extractedCedenteName, cnpj: extractedCedenteCnpj || "Não informado" });
            } else {
                setXmlWarning(null);
            }
            
            setFormData((prev: any) => {
                const combinedSacados = [...prev.sacados, ...extractedSacados];
                const totalActiveBruto = combinedSacados.filter(s => s.active).reduce((sum, s) => sum + (Number(s.valor)||0), 0);
                const calcDias = calculatePrazoMedio(combinedSacados, prev.date);
                
                let newState = {
                    ...prev,
                    clientId: matchedClient ? matchedClient.id : prev.clientId,
                    valorBruto: String(totalActiveBruto),
                    sacados: combinedSacados,
                    dias: calcDias || prev.dias
                };

                if (newState.clientId && newState.dias) {
                    newState = applyClientRates(newState.clientId, newState, true);
                }

                return newState;
            });
        });
    };

    const toggleSacado = (id: string) => {
        setFormData(prev => {
            const newSacados = prev.sacados.map(s => s.id === id ? { ...s, active: !s.active } : s);
            const totalActiveBruto = newSacados.filter(s => s.active).reduce((sum, s) => sum + (Number(s.valor)||0), 0);
            const calcDias = calculatePrazoMedio(newSacados, prev.date);
            
            let newState = {
                ...prev,
                valorBruto: String(totalActiveBruto),
                sacados: newSacados,
                dias: calcDias || prev.dias
            };

            if (newState.clientId && newState.dias) {
                newState = applyClientRates(newState.clientId, newState, false);
            }

            return newState;
        });
    };

    const deleteSacado = (id: string) => {
        setFormData(prev => {
            const newSacados = prev.sacados.filter((s: any) => s.id !== id);
            const totalActiveBruto = newSacados.filter((s: any) => s.active).reduce((sum: number, s: any) => sum + (Number(s.valor)||0), 0);
            const calcDias = calculatePrazoMedio(newSacados, prev.date);
            
            let newState = {
                ...prev,
                valorBruto: String(totalActiveBruto),
                sacados: newSacados,
                dias: calcDias || prev.dias
            };

            if (newState.clientId && newState.dias) {
                newState = applyClientRates(newState.clientId, newState, false);
            }

            return newState;
        });
    };

    const toggleTarifa = (id: string) => {
        setFormData(prev => {
            const newList = prev.tarifasList.map((t: any) => t.id === id ? { ...t, active: !t.active } : t);
            const totalTarifas = newList.filter((t: any) => t.active).reduce((sum: number, t: any) => sum + (Number(t.valor) || 0), 0);
            const bruto = parseFloat(prev.valorBruto) || 0;
            const perc = bruto > 0 ? ((totalTarifas / bruto) * 100).toString() : prev.percentualTarifas;
            return {
                ...prev,
                tarifasList: newList,
                tarifas: String(totalTarifas),
                percentualTarifas: perc
            };
        });
    };

    const updateTarifaValue = (id: string, newVal: string) => {
        setFormData(prev => {
            const newList = prev.tarifasList.map((t: any) => t.id === id ? { ...t, valor: newVal } : t);
            const totalTarifas = newList.filter((t: any) => t.active).reduce((sum: number, t: any) => sum + (Number(t.valor) || 0), 0);
            const bruto = parseFloat(prev.valorBruto) || 0;
            const perc = bruto > 0 ? ((totalTarifas / bruto) * 100).toString() : prev.percentualTarifas;
            return {
                ...prev,
                tarifasList: newList,
                tarifas: String(totalTarifas),
                percentualTarifas: perc
            };
        });
    };

    const addTarifa = () => {
        setFormData(prev => ({
            ...prev,
            tarifasList: [
                ...prev.tarifasList,
                { id: Math.random().toString(), nome: "Nova Tarifa", valor: "0", active: true }
            ]
        }));
    };

    const comparisonInfo = useMemo(() => {
        if (!formData.clientId || !clientLastOperationRate) return null;
        const lastOp = clientLastOperationRate[formData.clientId];
        if (!lastOp) return null;
        
        const currentRate = parseFloat(formData.percentual) || 0;
        const lastRate = lastOp.percentual || 0;
        
        if (currentRate === 0 || lastRate === 0) return null;
        
        const diff = Number((currentRate - lastRate).toFixed(4));
        if (diff > 0) {
            return {
                type: "ACIMA",
                diff: `+${diff.toLocaleString('pt-BR')}%`,
                text: `cobrando ACIMA do histórico (${diff.toLocaleString('pt-BR')}% superior)`,
                color: "var(--accent-red)"
            };
        } else if (diff < 0) {
            return {
                type: "ABAIXO",
                diff: `${diff.toLocaleString('pt-BR')}%`,
                text: `cobrando ABAIXO do histórico (${Math.abs(diff).toLocaleString('pt-BR')}% inferior)`,
                color: "var(--accent-primary)"
            };
        } else {
            return {
                type: "IGUAL",
                diff: "0%",
                text: "cobrando o mesmo valor do histórico",
                color: "var(--text-secondary)"
            };
        }
    }, [formData.clientId, formData.percentual, clientLastOperationRate]);

    return (
        <div className="responsive-p">
            <div className="responsive-header-flex" style={{ flexWrap: "wrap", alignItems: "center", justifyContent: "center", marginBottom: "2rem" }}>
                <div className="filters-container" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%", maxWidth: "400px", margin: "0 auto" }}>
                    <div style={{ width: "100%" }}>
                        <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.5rem", display: "block", textAlign: "center" }}>Filtrar por Cedente</label>
                        <input type="text" className="glass-input" placeholder="Nome do cedente..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} style={{ textAlign: "center" }}/>
                    </div>
                    <div style={{ width: "100%" }}>
                        <label style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.5rem", display: "block", textAlign: "center" }}>Filtrar por Data</label>
                        <input type="date" className="glass-input" value={dateSearch} onChange={(e) => setDateSearch(e.target.value)} style={{ textAlign: "center" }}/>
                    </div>
                </div>
                {isAdminOrManager && (
                    <div style={{ width: "100%", display: "flex", justifyContent: "center", gap: "1rem", marginTop: "1.5rem" }}>
                        <button className="btn-primary" onClick={handleOpenModal} style={{ padding: "0.75rem 1.5rem", fontSize: "0.875rem", height: "auto", width: "auto" }}>
                            + Nova Operação
                        </button>
                        <button className="btn-secondary" onClick={() => document.getElementById('main-xml-uploader')?.click()} style={{ padding: "0.75rem 1.5rem", fontSize: "0.875rem", height: "auto", width: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            Importar XMLs
                        </button>
                        <input id="main-xml-uploader" type="file" multiple accept=".xml" style={{ display: "none" }} onChange={(e) => {
                            handleOpenModal();
                            handleFileUpload(e);
                        }} />
                    </div>
                )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
                <div className="glass-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Nº de Operações</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>{operations.length}</span>
                </div>
                <div className="glass-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Total Bruto</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>{formatCurrency(sumColumn("valorBruto"))}</span>
                </div>
                <div className="glass-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Valor Líquido</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--accent-primary)" }}>{formatCurrency(sumColumn("valorLiquido"))}</span>
                </div>
                <div className="glass-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Fator Total</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>{formatCurrency(sumColumn("fator"))}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                        Média: {formatPercent(calculateWeightedAveragePercent("percentual"))}
                    </span>
                </div>
                <div className="glass-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Total Custos</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {formatCurrency(
                            sumColumn("fator") +
                            sumColumn("tarifas") +
                            sumColumn("adValorem") +
                            sumColumn("iof") +
                            sumColumn("iofAdicional") +
                            sumColumn("irpj")
                        )}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                        Média: {formatPercent(
                            calculateWeightedAveragePercent("percentual") +
                            calculateWeightedAveragePercent("percentualTarifas") +
                            calculateWeightedAveragePercent("percentualAdValorem")
                        )}
                    </span>
                </div>
                <div className="glass-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase" }}>Prazo Médio</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text-primary)" }}>{calculateAverageDays().toFixed(1)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-tertiary)' }}>Dias</span></span>
                </div>
            </div>

            <div className="desktop-only" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", whiteSpace: "nowrap" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--glass-border-light)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Data</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Cedente</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500, borderLeft: "1px dashed var(--glass-border)" }}>Bruto Operação</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Fator</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Dias</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500, borderLeft: "1px dashed var(--glass-border)" }}>Tarifas</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>Ad Valorem</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>IOF</th>
                            <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>IOF Adic.</th>
                            <th style={{ padding: "1rem", color: "var(--accent-primary)", fontWeight: 500, borderLeft: "1px dashed var(--glass-border)" }}>Valor Líquido</th>
                            <th style={{ padding: "1rem", color: "var(--accent-red)", fontWeight: 500 }}>Recompra</th>
                            {isAdminOrManager && <th style={{ padding: "1rem", color: "var(--text-secondary)", fontWeight: 500, textAlign: "right" }}>Ações</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {operations.map((op) => (
                            <tr key={op.id} onClick={(e) => { if (!(e.target as HTMLElement).closest('button')) toggleSelection(op.id); }} style={{ cursor: "pointer", backgroundColor: selectedIds.has(op.id) ? "rgba(16, 185, 129, 0.1)" : "transparent", borderBottom: "1px solid var(--glass-border)", transition: "background var(--transition-fast)", fontSize: "0.875rem" }} className="hover-row">
                                <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>{new Date(op.date).toLocaleDateString("pt-BR", { timeZone: 'UTC' })}</td>
                                <td style={{ padding: "0.75rem 1rem", fontWeight: 500 }}>{op.client.name}</td>
                                <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>{formatCurrency(op.valorBruto)}</td>
                                <td style={{ padding: "0.75rem 1rem", color: "var(--text-tertiary)" }}>{formatCurrency(op.fator)}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{op.dias}</td>
                                <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>{formatCurrency(op.tarifas)}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{formatCurrency(op.adValorem)}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{formatCurrency(op.iof)}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{formatCurrency(op.iofAdicional)}</td>
                                <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)", fontWeight: 600, color: "var(--accent-primary)" }}>{formatCurrency(op.valorLiquido)}</td>
                                <td style={{ padding: "0.75rem 1rem", fontWeight: 500, color: op.recompra ? "var(--accent-red)" : "inherit" }}>{op.recompra ? formatCurrency(op.recompra) : "-"}</td>
                                {isAdminOrManager && (
                                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", alignItems: "center" }}>
                                            <button onClick={() => handleEdit(op)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", backgroundColor: "rgba(16, 185, 129, 0.1)", color: "var(--accent-primary)", border: "1px solid var(--accent-primary)", borderRadius: "var(--radius-sm)" }}>Editar</button>
                                            <button onClick={() => handleDelete(op.id)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", backgroundColor: "rgba(239, 68, 68, 0.1)", color: "var(--accent-red)", border: "1px solid var(--accent-red)", borderRadius: "var(--radius-sm)" }}>Excluir</button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    {operations.length > 0 && (
                        <tfoot>
                            <tr style={{ borderTop: "2px solid var(--glass-border)", fontWeight: 600 }}>
                                <td style={{ padding: "0.75rem 1rem" }} colSpan={2}>Total</td>
                                <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>{formatCurrency(sumColumn("valorBruto"))}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{formatCurrency(sumColumn("fator"))}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{calculateAverageDays().toFixed(1)} d</td>
                                <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)" }}>{formatCurrency(sumColumn("tarifas"))}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{formatCurrency(sumColumn("adValorem"))}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{formatCurrency(sumColumn("iof"))}</td>
                                <td style={{ padding: "0.75rem 1rem" }}>{formatCurrency(sumColumn("iofAdicional"))}</td>
                                <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)", color: "var(--accent-primary)" }}>{formatCurrency(sumColumn("valorLiquido"))}</td>
                                <td style={{ padding: "0.75rem 1rem", color: "var(--accent-red)" }}>{formatCurrency(sumColumn("recompra"))}</td>
                                {isAdminOrManager && <td></td>}
                            </tr>
                            {selectedIds.size > 0 && (
                                <tr style={{ borderTop: "1px dashed var(--glass-border)", fontWeight: 600, backgroundColor: "rgba(16, 185, 129, 0.05)" }}>
                                    <td style={{ padding: "0.75rem 1rem", color: "var(--accent-primary)" }} colSpan={2}>Sel. ({selectedIds.size} itens)</td>
                                    <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)", color: "var(--accent-primary)" }}>{formatCurrency(sumColumn("valorBruto", true))}</td>
                                    <td style={{ padding: "0.75rem 1rem", color: "var(--accent-primary)" }}>{formatCurrency(sumColumn("fator", true))}</td>
                                    <td style={{ padding: "0.75rem 1rem", color: "var(--accent-primary)" }}>{calculateAverageDays(true).toFixed(1)} d</td>
                                    <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)", color: "var(--accent-primary)" }}>{formatCurrency(sumColumn("tarifas", true))}</td>
                                    <td style={{ padding: "0.75rem 1rem", color: "var(--accent-primary)" }}>{formatCurrency(sumColumn("adValorem", true))}</td>
                                    <td style={{ padding: "0.75rem 1rem", color: "var(--accent-primary)" }}>{formatCurrency(sumColumn("iof", true))}</td>
                                    <td style={{ padding: "0.75rem 1rem", color: "var(--accent-primary)" }}>{formatCurrency(sumColumn("iofAdicional", true))}</td>
                                    <td style={{ padding: "0.75rem 1rem", borderLeft: "1px dashed var(--glass-border)", color: "var(--text-primary)" }}>{formatCurrency(sumColumn("valorLiquido", true))}</td>
                                    <td style={{ padding: "0.75rem 1rem", color: "var(--accent-red)" }}>{formatCurrency(sumColumn("recompra", true))}</td>
                                    {isAdminOrManager && <td></td>}
                                </tr>
                            )}
                        </tfoot>
                    )}
                </table>
            </div>

            <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {operations.map(op => (
                    <div key={op.id} className="glass-card" onClick={() => isAdminOrManager && handleEdit(op)} style={{ padding: "1.25rem", cursor: isAdminOrManager ? "pointer" : "default", display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.875rem", color: "var(--text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>Cedente: {op.client.name}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Data: {new Date(op.date).toLocaleDateString("pt-BR", { timeZone: 'UTC' })}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Prazo: {op.dias} dias</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Bruto: {formatCurrency(op.valorBruto)}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.875rem", color: "var(--accent-primary)", fontWeight: 600 }}>Valor Líquido: {formatCurrency(op.valorLiquido)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
                    <div className="glass-card" style={{ width: "100%", maxWidth: "800px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem", maxHeight: "90vh", overflowY: "auto" }}>
                        <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>{editingId ? "Editar Operação" : "Nova Operação"}</h3>

                        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                            {xmlWarning && (
                                <div style={{
                                    padding: "1rem",
                                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                                    border: "1px solid var(--accent-red)",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: "0.875rem",
                                    color: "var(--text-primary)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.5rem"
                                }}>
                                    <div style={{ fontWeight: 700, color: "var(--accent-red)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                        Cedente Não Encontrado!
                                    </div>
                                    <span>
                                        O emitente do XML <strong>{xmlWarning.name}</strong> {xmlWarning.cnpj !== "Não informado" && <> (CNPJ: {xmlWarning.cnpj})</>} não foi localizado na base de dados de clientes.
                                    </span>
                                    <a href="/clientes" target="_blank" rel="noopener noreferrer" style={{
                                        color: "var(--accent-primary)",
                                        fontWeight: 700,
                                        textDecoration: "underline",
                                        marginTop: "0.25rem",
                                        alignSelf: "flex-start",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.25rem"
                                    }}>
                                        Ir para o Cadastro de Cedentes &rarr;
                                    </a>
                                </div>
                            )}

                            <div className="form-grid-2">
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Data</label>
                                    <input required type="date" className="glass-input" value={formData.date} onChange={e => {
                                        const dateVal = e.target.value;
                                        setFormData(prev => {
                                            const calcDias = calculatePrazoMedio(prev.sacados, dateVal);
                                            let newState = { ...prev, date: dateVal, dias: calcDias || prev.dias };
                                            if (newState.clientId && newState.dias) {
                                                newState = applyClientRates(newState.clientId, newState, false);
                                            }
                                            return newState;
                                        });
                                    }} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Cedente</label>
                                    <select required className="glass-input" value={formData.clientId} onChange={e => {
                                        let newState = { ...formData, clientId: e.target.value };
                                        newState = applyClientRates(e.target.value, newState, true);
                                        setFormData(newState);
                                        setXmlWarning(null);
                                    }}>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {formData.sacados && formData.sacados.length > 0 && (
                                <div style={{ padding: "1rem", backgroundColor: "rgba(16, 185, 129, 0.05)", border: "1px dashed var(--accent-primary)", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--accent-primary)" }}>NFs/Títulos Carregados ({formData.sacados.filter(s=>s.active).length} ativos)</span>
                                    </div>
                                    
                                    <div style={{ overflowX: "auto", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "var(--radius-sm)" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                            <thead>
                                                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(0,0,0,0.2)" }}>
                                                    <th style={{ padding: "0.5rem", width: "40px" }}></th>
                                                    <th style={{ padding: "0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Sacado</th>
                                                    <th style={{ padding: "0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>Vencimento</th>
                                                    <th style={{ padding: "0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "right" }}>Valor</th>
                                                    <th style={{ padding: "0.5rem", width: "45px" }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.sacados.map((s: any, idx: number) => (
                                                    <tr key={s.id || idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", opacity: s.active ? 1 : 0.4 }}>
                                                        <td style={{ padding: "0.5rem", textAlign: "center" }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={s.active !== false} 
                                                                onChange={() => toggleSacado(s.id)} 
                                                                style={{ cursor: "pointer", accentColor: "var(--accent-primary)" }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: "0.5rem", fontSize: "0.75rem", color: "var(--text-primary)" }}>
                                                            {s.nome} {s.cnpj && <span style={{ color: "var(--text-tertiary)" }}>({s.cnpj})</span>}
                                                        </td>
                                                        <td style={{ padding: "0.5rem", fontSize: "0.75rem", color: "var(--text-primary)" }}>
                                                            {s.vencimento ? new Date(s.vencimento).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : "---"}
                                                        </td>
                                                        <td style={{ padding: "0.5rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)", textAlign: "right" }}>
                                                            {formatCurrency(s.valor)}
                                                        </td>
                                                        <td style={{ padding: "0.5rem", textAlign: "center" }}>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => deleteSacado(s.id)}
                                                                style={{ 
                                                                    background: "transparent", 
                                                                    border: "none", 
                                                                    cursor: "pointer", 
                                                                    color: "var(--accent-red)",
                                                                    padding: "2px",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center"
                                                                }}
                                                                title="Excluir parcela"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                                </svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="form-grid-2">
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Bruto Operação (R$)</label>
                                    <NumericFormat required className="glass-input" value={formData.valorBruto} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => {
                                        let newState = { ...formData, valorBruto: v.floatValue !== undefined ? String(v.floatValue) : "" };
                                        if (newState.clientId && newState.dias) newState = applyClientRates(newState.clientId, newState, false);
                                        setFormData(newState);
                                    }} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Dias (Prazo Médio)</label>
                                    <input required type="number" className="glass-input" value={formData.dias} onChange={e => {
                                        let newState = { ...formData, dias: e.target.value };
                                        if (newState.clientId && newState.valorBruto) newState = applyClientRates(newState.clientId, newState, false);
                                        setFormData(newState);
                                    }} />
                                </div>
                            </div>

                            <div className="form-grid-2">
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Fator (%)</label>
                                    <NumericFormat required className="glass-input" value={formData.percentual} thousandSeparator="." decimalSeparator="," decimalScale={4} onValueChange={(v: any) => {
                                        const p = v.floatValue;
                                        let newState = { ...formData, percentual: p !== undefined ? String(p) : "" };
                                        if (p !== undefined && formData.valorBruto && formData.dias) {
                                            const bruto = parseFloat(formData.valorBruto);
                                            const dias = parseFloat(formData.dias);
                                            const calcVal = bruto * (p / 100 / 30) * dias;
                                            newState.fator = calcVal > 0 ? calcVal.toFixed(2) : "";
                                        }
                                        setFormData(newState);
                                    }} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Fator (R$)</label>
                                    <NumericFormat required className="glass-input" value={formData.fator} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => {
                                        const f = v.floatValue;
                                        let newState = { ...formData, fator: f !== undefined ? String(f) : "" };
                                        if (f !== undefined && formData.valorBruto && formData.dias) {
                                            const bruto = parseFloat(formData.valorBruto);
                                            const dias = parseFloat(formData.dias);
                                            if (bruto > 0 && dias > 0) {
                                                const perc = (f / bruto / dias) * 30 * 100;
                                                newState.percentual = perc.toString();
                                            }
                                        }
                                        setFormData(newState);
                                    }} />
                                </div>
                            </div>

                            {comparisonInfo && (
                                <div style={{
                                    padding: "0.75rem 1rem",
                                    backgroundColor: comparisonInfo.type === "ACIMA" ? "rgba(239, 68, 68, 0.05)" : comparisonInfo.type === "ABAIXO" ? "rgba(16, 185, 129, 0.05)" : "rgba(255, 255, 255, 0.03)",
                                    border: `1px solid ${comparisonInfo.type === "ACIMA" ? "var(--accent-red)" : comparisonInfo.type === "ABAIXO" ? "var(--accent-primary)" : "var(--glass-border)"}`,
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: "0.8125rem",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginTop: "-0.5rem",
                                    marginBottom: "0.5rem"
                                }}>
                                    <span style={{ color: "var(--text-secondary)" }}>Comparação de Fator:</span>
                                    <span style={{
                                        fontWeight: 700,
                                        color: comparisonInfo.color,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.25rem"
                                    }}>
                                        {comparisonInfo.type === "ACIMA" ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                                        ) : comparisonInfo.type === "ABAIXO" ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        ) : null}
                                        {comparisonInfo.text}
                                    </span>
                                </div>
                            )}

                            <div style={{ padding: "1rem", backgroundColor: "rgba(255, 255, 255, 0.02)", border: "1px dashed var(--glass-border)", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Menu de Tarifas da Operação</span>
                                    <button type="button" onClick={addTarifa} style={{ fontSize: "0.75rem", color: "var(--accent-primary)", background: "transparent", border: "none", cursor: "pointer", fontWeight: 600 }}>+ Criar Tarifa</button>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    {formData.tarifasList.map((t: any) => (
                                        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                            <input type="checkbox" checked={t.active} onChange={() => toggleTarifa(t.id)} style={{ accentColor: "var(--accent-primary)", cursor: "pointer" }} />
                                            <input type="text" className="glass-input" value={t.nome} onChange={(e) => setFormData(prev => ({ ...prev, tarifasList: prev.tarifasList.map((x:any) => x.id === t.id ? { ...x, nome: e.target.value } : x) }))} style={{ flex: 1, padding: "0.25rem 0.5rem", fontSize: "0.75rem" }} />
                                            <NumericFormat className="glass-input" value={t.valor} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => updateTarifaValue(t.id, v.floatValue !== undefined ? String(v.floatValue) : "")} style={{ width: "100px", padding: "0.25rem 0.5rem", fontSize: "0.75rem" }} />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="form-grid-1">
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Tarifas Consolidado (R$)</label>
                                    <NumericFormat required className="glass-input" value={formData.tarifas} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => {
                                        const val = v.floatValue;
                                        setFormData(prev => {
                                            const bruto = parseFloat(prev.valorBruto) || 0;
                                            const perc = bruto > 0 && val !== undefined ? ((val / bruto) * 100).toString() : prev.percentualTarifas;
                                            return { ...prev, tarifas: val !== undefined ? String(val) : "", percentualTarifas: perc };
                                        });
                                    }} />
                                </div>
                            </div>

                            <div className="form-grid-2">
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Ad Valorem (%)</label>
                                    <NumericFormat className="glass-input" value={formData.percentualAdValorem} thousandSeparator="." decimalSeparator="," decimalScale={4} onValueChange={(v: any) => {
                                        const p = v.floatValue;
                                        let newState = { ...formData, percentualAdValorem: p !== undefined ? String(p) : "" };
                                        if (p !== undefined && formData.valorBruto) {
                                            const calcVal = parseFloat(formData.valorBruto) * (p / 100);
                                            newState.adValorem = calcVal > 0 ? calcVal.toFixed(2) : "";
                                        }
                                        setFormData(newState);
                                    }} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Ad Valorem (R$)</label>
                                    <NumericFormat required className="glass-input" value={formData.adValorem} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => {
                                        const val = v.floatValue;
                                        let newState = { ...formData, adValorem: val !== undefined ? String(val) : "" };
                                        if (val !== undefined && formData.valorBruto) {
                                            const bruto = parseFloat(formData.valorBruto);
                                            if (bruto > 0) newState.percentualAdValorem = ((val / bruto) * 100).toString();
                                        }
                                        setFormData(newState);
                                    }} />
                                </div>
                            </div>

                            <div className="form-grid-2">
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>IOF (%)</label>
                                    <NumericFormat className="glass-input" value={formData.percentualIof} thousandSeparator="." decimalSeparator="," decimalScale={6} onValueChange={(v: any) => {
                                        const p = v.floatValue;
                                        let newState = { ...formData, percentualIof: p !== undefined ? String(p) : "" };
                                        if (p !== undefined && formData.valorBruto) {
                                            const calcVal = parseFloat(formData.valorBruto) * (p / 100);
                                            newState.iof = calcVal > 0 ? calcVal.toFixed(2) : "";
                                        }
                                        setFormData(newState);
                                    }} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>IOF (R$)</label>
                                    <NumericFormat className="glass-input" value={formData.iof} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => {
                                        const val = v.floatValue;
                                        let newState = { ...formData, iof: val !== undefined ? String(val) : "" };
                                        if (val !== undefined && formData.valorBruto) {
                                            const bruto = parseFloat(formData.valorBruto);
                                            if (bruto > 0) newState.percentualIof = ((val / bruto) * 100).toString();
                                        }
                                        setFormData(newState);
                                    }} />
                                </div>
                            </div>

                            <div className="form-grid-2">
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>IOF Adicional (%)</label>
                                    <NumericFormat className="glass-input" value={formData.percentualIofAdicional} thousandSeparator="." decimalSeparator="," decimalScale={6} onValueChange={(v: any) => {
                                        const p = v.floatValue;
                                        let newState = { ...formData, percentualIofAdicional: p !== undefined ? String(p) : "" };
                                        if (p !== undefined && formData.valorBruto) {
                                            const calcVal = parseFloat(formData.valorBruto) * (p / 100);
                                            newState.iofAdicional = calcVal > 0 ? calcVal.toFixed(2) : "";
                                        }
                                        setFormData(newState);
                                    }} />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>IOF Adicional (R$)</label>
                                    <NumericFormat className="glass-input" value={formData.iofAdicional} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => {
                                        const val = v.floatValue;
                                        let newState = { ...formData, iofAdicional: val !== undefined ? String(val) : "" };
                                        if (val !== undefined && formData.valorBruto) {
                                            const bruto = parseFloat(formData.valorBruto);
                                            if (bruto > 0) newState.percentualIofAdicional = ((val / bruto) * 100).toString();
                                        }
                                        setFormData(newState);
                                    }} />
                                </div>
                            </div>

                            <div className="form-grid-2">
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--accent-primary)", fontWeight: 600 }}>Valor Líquido Operação (R$)</label>
                                    <NumericFormat readOnly className="glass-input" style={{ borderColor: "var(--accent-primary)", backgroundColor: "rgba(16,185,129,0.05)" }} value={formData.valorLiquido} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " />
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <label style={{ fontSize: "0.875rem", color: "var(--accent-red)", fontWeight: 600 }}>Recompra (R$)</label>
                                    <NumericFormat className="glass-input" style={{ borderColor: "var(--accent-red)" }} value={formData.recompra} thousandSeparator="." decimalSeparator="," decimalScale={2} fixedDecimalScale={true} prefix="R$ " onValueChange={(v: any) => setFormData({ ...formData, recompra: v.floatValue !== undefined ? String(v.floatValue) : "" })} />
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                                <input type="checkbox" id="declarada" checked={formData.declarada} onChange={(e) => setFormData({ ...formData, declarada: e.target.checked })} style={{ width: "18px", height: "18px", accentColor: "var(--accent-primary)", cursor: "pointer" }} />
                                <label htmlFor="declarada" style={{ fontSize: "0.875rem", color: "var(--text-secondary)", cursor: "pointer", fontWeight: 500 }}>
                                    Operação Declarada/Contabilizada
                                </label>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--glass-border)" }}>
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={loading}>{loading ? "Salvando..." : (editingId ? "Atualizar Operação" : "Salvar Operação")}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `.hover-row:hover { background-color: var(--glass-bg-hover); }`}} />
        </div>
    );
}

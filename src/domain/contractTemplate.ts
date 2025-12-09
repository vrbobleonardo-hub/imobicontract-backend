import { MaritalRegime, MaritalStatus } from './types';

export type ContractTemplatePerson = {
  fullName: string;
  nationality: string;
  profession: string;
  rg: string;
  rgIssuer: string;
  cpf: string;
  maritalStatus: MaritalStatus;
  maritalRegime?: MaritalRegime | string | null;
  spouseName?: string | null;
  spouseCpf?: string | null;
  spouseRg?: string | null;
  isUnionStable?: boolean | null;
  address: string;
};

export type ContractTemplateParams = {
  landlords: ContractTemplatePerson[];
  tenants: ContractTemplatePerson[];
  property: {
    fullAddress: string;
    description?: string;
    parkingSpaces?: number;
    parkingType?: string;
    parkingNumber?: string;
    district?: string;
    postalCode?: string;
    city: string;
    state: string;
  };
  dates: {
    startDate: string;
    endDate: string;
    contractDurationMonths?: number;
    exemptionMonth?: number;
    depositLimitDate?: string;
    contractSignLimitDate?: string;
    keysDeliveryDate?: string;
  };
  values: {
    rentValue: number;
    condoValue?: number;
    iptuValue?: number;
    depositValue?: number;
    totalMonthly?: number;
  };
  payment: {
    dueDay: number;
    rentRecipientName?: string;
    rentRecipientCpf?: string;
    bankName?: string;
    agency?: string;
    account?: string;
    pixKey?: string;
    depositAccountName?: string;
    depositBankName?: string;
    depositAgency?: string;
    depositAccount?: string;
    depositCpf?: string;
  };
  admin?: {
    creci?: string;
    phone?: string;
    address?: string;
    name?: string;
    whatsapp?: string;
  };
  insurance?: {
    referenceValue?: number;
  };
  codes?: {
    energyCode?: string;
    gasCode?: string;
    waterCode?: string;
  };
};

const STATUS_MAP: Record<MaritalStatus, string> = {
  SOLTEIRO: 'solteiro(a)',
  CASADO: 'casado(a)',
  UNIAO_ESTAVEL: 'em união estável',
  DIVORCIADO: 'divorciado(a)',
  VIUVO: 'viúvo(a)',
};

function formatDate(date: string | Date | undefined): string {
  if (!date) return '[preencher data]';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '[preencher data]';
  return d.toLocaleDateString('pt-BR');
}

function formatMoney(value?: number | null): string {
  const num = typeof value === 'number' ? value : 0;
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function valueOrPlaceholder(value?: string | number | null, placeholder = '[preencher]'): string {
  if (value === undefined || value === null || value === '') return placeholder;
  return String(value);
}

function joinWithE(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join('; ')} e ${items[items.length - 1]}`;
}

export function formatMaritalStatus(person: ContractTemplatePerson): string {
  const base = STATUS_MAP[person.maritalStatus] || person.maritalStatus.toLowerCase();
  if (person.maritalStatus === 'CASADO') {
    if (person.spouseName) {
      const regime =
        person.maritalRegime && person.maritalRegime !== 'OUTRO'
          ? person.maritalRegime.replace('_', ' ').toLowerCase()
          : 'comunhão parcial de bens';
      const spouseRg = valueOrPlaceholder(person.spouseRg, 'RG nº ...');
      const spouseCpf = valueOrPlaceholder(person.spouseCpf, 'CPF nº ...');
      return `${base} sob o regime da ${regime} com ${person.spouseName}, ${spouseRg}, ${spouseCpf}`;
    }
    return `${base} sob o regime informado`;
  }
  if (person.maritalStatus === 'UNIAO_ESTAVEL') {
    if (person.spouseName) {
      const spouseRg = valueOrPlaceholder(person.spouseRg, 'RG nº ...');
      const spouseCpf = valueOrPlaceholder(person.spouseCpf, 'CPF nº ...');
      return `em união estável com ${person.spouseName}, ${spouseRg}, ${spouseCpf}`;
    }
    return 'em união estável';
  }
  return base;
}

export function formatPersonAsParty(person: ContractTemplatePerson): string {
  const marital = formatMaritalStatus(person);
  return `${person.fullName}, ${person.nationality}, ${person.profession}, portador(a) da cédula de identidade RG nº ${person.rg} ${person.rgIssuer}, inscrito(a) no CPF/MF sob nº ${person.cpf}, ${marital}, residente e domiciliado(a) à ${person.address}`;
}

export function buildContractText(params: ContractTemplateParams): string {
  const landlordsBlock = joinWithE(params.landlords.map(formatPersonAsParty));
  const tenantsBlock = joinWithE(params.tenants.map(formatPersonAsParty));

  const parkingSpaces = params.property.parkingSpaces ?? 0;
  const parkingType = valueOrPlaceholder(params.property.parkingType, 'coberta/descoberta');
  const parkingNumber = valueOrPlaceholder(params.property.parkingNumber, 'nº vaga');
  const district = valueOrPlaceholder(params.property.district, '[Bairro]');
  const postalCode = valueOrPlaceholder(params.property.postalCode, '[CEP]');
  const totalMonthly =
    params.values.totalMonthly ??
    (params.values.rentValue || 0) + (params.values.condoValue || 0) + (params.values.iptuValue || 0);

  const durationMonths =
    params.dates.contractDurationMonths ||
    Math.max(
      1,
      Math.round(
        (new Date(params.dates.endDate).getTime() - new Date(params.dates.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
      )
    );

  const admin = {
    creci: valueOrPlaceholder(params.admin?.creci, '[CRECI_IMOBILIARIA]'),
    phone: valueOrPlaceholder(params.admin?.phone, '[TELEFONE_IMOBILIARIA]'),
    address: valueOrPlaceholder(params.admin?.address, '[ENDERECO_COMPLETO_IMOBILIARIA]'),
    name: valueOrPlaceholder(params.admin?.name, '[NOME_ADMINISTRADORA]'),
    whatsapp: valueOrPlaceholder(params.admin?.whatsapp, '[WHATSAPP_ADMINISTRADORA]'),
  };

  const payment = {
    rentRecipientName: valueOrPlaceholder(params.payment.rentRecipientName, '[NOME_TITULAR_CONTA_RECEBIMENTO]'),
    rentRecipientCpf: valueOrPlaceholder(params.payment.rentRecipientCpf, '[CPF_TITULAR_CONTA_RECEBIMENTO]'),
    bankName: valueOrPlaceholder(params.payment.bankName, '[NOME_BANCO]'),
    agency: valueOrPlaceholder(params.payment.agency, '[NUMERO_AGENCIA]'),
    account: valueOrPlaceholder(params.payment.account, '[NUMERO_CONTA]'),
    pixKey: valueOrPlaceholder(params.payment.pixKey, '[CHAVE_PIX_RECEBIMENTO]'),
    depositValue: formatMoney(params.values.depositValue ?? 0),
    depositLimitDate: formatDate(params.dates.depositLimitDate),
    depositAccountName: valueOrPlaceholder(params.payment.depositAccountName, '[NOME_TITULAR_CONTA_CAUCAO]'),
    depositBankName: valueOrPlaceholder(params.payment.depositBankName, '[NOME_BANCO_CAUCAO]'),
    depositAgency: valueOrPlaceholder(params.payment.depositAgency, '[AGENCIA_CAUCAO]'),
    depositAccount: valueOrPlaceholder(params.payment.depositAccount, '[TIPO_E_NUMERO_CONTA_CAUCAO]'),
    depositCpf: valueOrPlaceholder(params.payment.depositCpf, '[CPF_TITULAR_CONTA_CAUCAO]'),
  };

  const insuranceRef = params.insurance?.referenceValue
    ? formatMoney(params.insurance.referenceValue)
    : formatMoney(params.values.rentValue * 20 || 0);

  return `E.M.Rodrigues
CRECI ${admin.creci}
Tel. ${admin.phone}
${admin.address}

CONTRATO DE LOCAÇÃO RESIDENCIAL

LOCADORES: ${landlordsBlock}.

LOCATÁRIOS: ${tenantsBlock}.

OBJETO: Um apartamento residencial, localizado em ${params.property.fullAddress},
${valueOrPlaceholder(params.property.description, '[DESCRIÇÃO_COMPLEMENTO_IMOVEL – bloco, torre, nº do apartamento]')},
com ${parkingSpaces} vaga(s) de garagem ${parkingType}, nº ${parkingNumber},
${district}, CEP ${postalCode}, ${params.property.city}/${params.property.state}.

CLÁUSULA PRIMEIRA – DO PRAZO DE LOCAÇÃO
O prazo de vigência deste contrato é de ${durationMonths} meses, iniciando-se em
${formatDate(params.dates.startDate)} e cessando de pleno direito em ${formatDate(params.dates.endDate)},
independentemente de notificação judicial ou extrajudicial, obrigando os locatários a
restituírem o imóvel completamente livre e desocupado, em perfeitas condições de uso,
tal como o recebeu.

Parágrafo Único: Os locatários ficarão isentos da multa contratual a partir do
${valueOrPlaceholder(params.dates.exemptionMonth ?? 0)}º mês de locação, desde que comuniquem à imobiliária, por escrito,
com antecedência mínima de 30 (trinta) dias, o interesse em devolver o imóvel. Caso não o
façam, será cobrada multa proporcional equivalente a 3 (três) aluguéis, calculada conforme
a data de desocupação e entrega das chaves.

CLÁUSULA SEGUNDA – DO VALOR DO ALUGUEL E ENCARGOS
O aluguel mensal convencionado é de ${formatMoney(params.values.rentValue)}. A este valor adicionam-se a
taxa de condomínio de ${formatMoney(params.values.condoValue ?? 0)} e o IPTU de ${formatMoney(params.values.iptuValue ?? 0)},
totalizando ${formatMoney(totalMonthly)}, desde que pago até o dia ${params.payment.dueDay}
do mês vencido.

No caso de atraso, o aluguel e demais encargos serão acrescidos de multa de 10%
(dez por cento), além do previsto na Cláusula XI e seus parágrafos. O aluguel será
reajustado anualmente conforme a variação do IPCA.

§ 1º – Caso haja alteração nos valores do condomínio ou do IPTU, os locatários serão
responsáveis pelo pagamento dos novos valores, mediante notificação formal e apresentação
dos respectivos boletos ou lançamentos.

§ 2º – O consumo de luz, água, gás e demais serviços públicos serão de responsabilidade
exclusiva dos locatários.

CLÁUSULA TERCEIRA – DO PAGAMENTO
O pagamento do aluguel e encargos deverá ser efetuado até o dia ${params.payment.dueDay} de
cada mês vencido, através de transferência bancária (TED) a favor de
${payment.rentRecipientName}, CPF nº ${payment.rentRecipientCpf},
Banco ${payment.bankName}, Agência ${payment.agency}, Conta Corrente ${payment.account},
ou através da chave PIX nº ${payment.pixKey}.

CLÁUSULA QUARTA-A – DO DEPÓSITO ANTECIPADO DA CAUÇÃO, ASSINATURA DO CONTRATO
E ENTREGA DAS CHAVES
Fica expressamente ajustado entre as partes que o depósito caução, no valor total de
${payment.depositValue}, correspondente a três meses de aluguel, deverá ser efetuado
pelos LOCATÁRIOS até o dia ${payment.depositLimitDate}, em conta bancária de
titularidade dos LOCADORES.

O comprovante do depósito deverá ser encaminhado ao WhatsApp nº ${admin.whatsapp},
da administradora ${admin.name}, constituindo condição essencial para a assinatura
e reconhecimento de firma deste contrato.

O pagamento antecipado da caução tem por objetivo garantir a efetiva celebração e
cumprimento deste contrato, constituindo sinal de seriedade e compromisso
(arras confirmatórias – art. 417 do Código Civil).

Após a comprovação do depósito caução, as partes deverão assinar e reconhecer firma
até o dia ${formatDate(params.dates.contractSignLimitDate)}.

A entrega das chaves ocorrerá em ${formatDate(params.dates.keysDeliveryDate)}, data em que se iniciará o prazo
da locação.

O descumprimento de quaisquer dos prazos estabelecidos implicará rescisão automática
do acordo, sem necessidade de notificação judicial ou extrajudicial, podendo os LOCADORES
reter integralmente o valor da caução a título de indenização pré-fixada por desistência,
salvo ajuste diverso por escrito.

CLÁUSULA QUARTA B – DA CAUÇÃO DO IMÓVEL
Para garantia das obrigações deste contrato, os LOCATÁRIOS prestarão caução de
${payment.depositValue}, equivalente a três meses de aluguel, conforme artigo 37, inciso I,
da Lei nº 8.245/91.

PARÁGRAFO PRIMEIRO: O pagamento da caução será realizado até o dia
${payment.depositLimitDate}, mediante depósito na conta da LOCADORA
${payment.depositAccountName}, Banco ${payment.depositBankName}, agência ${payment.depositAgency},
conta ${payment.depositAccount}, CPF nº ${payment.depositCpf}.

PARÁGRAFO SEGUNDO: A caução será aplicada em conta poupança vinculada, conforme §1º
do artigo 38 da Lei do Inquilinato, e devolvida aos LOCATÁRIOS até 03 (três) dias úteis
após a entrega das chaves e vistoria final, descontando-se eventuais valores de reparo ou
débitos pendentes.

PARÁGRAFO TERCEIRO: A caução poderá ser total ou parcialmente retida pelos LOCADORES
em caso de descumprimento contratual, devidamente justificado e documentado.

CLÁUSULA QUINTA – DO USO DO IMÓVEL
O imóvel objeto deste contrato é locado exclusivamente para fins residenciais, sendo
expressamente vedada a alteração de sua destinação, bem como o uso para fins comerciais,
salvo com prévia e expressa autorização dos LOCADORES, por escrito.

Fica igualmente proibida a sublocação, cessão, transferência de direitos ou empréstimo,
total ou parcial, do imóvel a terceiros, sem o consentimento formal e escrito dos LOCADORES.

Parágrafo Único: Os LOCATÁRIOS obrigam-se a atender integralmente todas as exigências
dos PODERES PÚBLICOS decorrentes de seu uso do imóvel, responsabilizando-se por quaisquer
irregularidades de que derem causa. É também vedado realizar qualquer modificação, obra
ou alteração estrutural no imóvel sem a devida autorização expressa e por escrito dos
LOCADORES.

CLÁUSULA SEXTA – DAS MODIFICAÇÕES DO IMÓVEL
O imóvel objeto deste contrato será entregue aos LOCATÁRIOS nas condições descritas no
Laudo de Vistoria Inicial, devidamente assinado pelas partes e que passa a integrar este
contrato. Ao final da locação, os LOCATÁRIOS obrigam-se a devolvê-lo nas mesmas condições
em que o receberam, ressalvado o desgaste natural decorrente do uso regular. Para tanto,
será realizada uma nova vistoria na ocasião da entrega das chaves, com a presença dos
LOCADORES ou de seu representante legal.

§ 1º – É expressamente proibida a realização de perfurações em armários, portas, partes
de madeira, tetos, azulejos, pisos e quaisquer outras superfícies fixas do imóvel, bem
como a colagem de papéis, adesivos ou fixação de materiais nos vidros das janelas,
armários ou demais estruturas. Os LOCATÁRIOS comprometem-se a zelar pelo imóvel e suas
dependências, mantendo-o em perfeitas condições de higiene, segurança, uso e
funcionamento, responsabilizando-se integralmente por todos os reparos e consertos
decorrentes de mau uso, inclusive pela substituição imediata de qualquer peça ou
equipamento danificado, utilizando materiais da mesma marca e qualidade, especialmente
no tocante à conservação de armários, portas, fechaduras, trincos, puxadores, vitrais,
vidros, luminárias, instalações elétricas, torneiras, aparelhos sanitários, entre outros.

§ 2º – Constatadas irregularidades ou necessidade de reparos no imóvel decorrentes de
uso inadequado, os LOCADORES apresentarão aos LOCATÁRIOS orçamento prévio elaborado
por profissional habilitado, facultando-lhes o pagamento imediato do valor orçado, como
forma de reparação. Alternativamente, os LOCATÁRIOS poderão optar por contratar, por sua
conta e risco, mão de obra especializada, assumindo integralmente os riscos por eventuais
imperfeições nos serviços executados, bem como pelo pagamento proporcional de aluguéis
correspondentes ao período de execução dos reparos.

A locação somente será considerada encerrada mediante a lavratura e assinatura do Termo
de Entrega de Chaves e Vistoria Final, emitido pela ADMINISTRADORA.

CLÁUSULA SÉTIMA – DA CONSERVAÇÃO DO IMÓVEL
As obras que importem segurança integral do imóvel serão executadas pelos LOCADORES, que
as custearão. Na hipótese de caracterização de mau uso do bem locado e, consequentemente,
havendo necessidade de serem efetuados consertos e/ou reparos em torneiras, vidros, rede
elétrica, hidráulica, telefone, esgoto, pinturas, azulejos, armário, fechaduras, etc.,
bem como qualquer dano causado pelos LOCATÁRIOS ou por outrem em qualquer parte interna
ou externa do imóvel, deverão ser feitas imediatamente pelos LOCATÁRIOS, de modo que,
reparado o dano, fique o bem locado nas mesmas condições em que foi recebido, sob pena
de, não fazendo tais reparos, serem realizados pelo LOCADOR e os gastos com os mesmos
serem cobrados por EXECUÇÃO OU COBRANÇA JUDICIAL, tudo conforme VISTORIA e FOTOS,
aceita expressamente nesta data que fica fazendo parte do presente contrato.

PARÁGRAFO ÚNICO: Todas essas reparações, excluídas as de segurança do imóvel, deverão
ser feitas empregando-se material da mesma qualidade que foi usado anteriormente na
construção danificada. Qualquer anormalidade que venha a surgir no imóvel deverá ser
imediatamente comunicada aos LOCADORES, cabendo a responsabilidade da comunicação aos
LOCATÁRIOS.

CLÁUSULA OITAVA – DA DESAPROPRIAÇÃO E INCÊNDIO
Em caso de desapropriação, fica rescindido de pleno direito, sem qualquer indenização
por parte dos LOCADORES, ressalvando-se, porém, o direito dos LOCADORES de reclamarem ao
poder expropriante a indenização pelos prejuízos porventura sofridos.

PARÁGRAFO PRIMEIRO: Os LOCATÁRIOS comprometem–se a contratar e manter, durante todo o
período de vigência deste contrato, seguro contra incêndio do imóvel locado, pelo valor
atualizado do imóvel, hoje estimado em ${insuranceRef}, tomando como
referência o valor de mercado. O seguro deverá ser contratado em favor dos proprietários,
que serão indicados como beneficiários diretos da apólice, de forma a garantir a
indenização em caso de sinistro.

PARÁGRAFO SEGUNDO: Os LOCATÁRIOS deverão apresentar à ADMINISTRADORA, no prazo de até
48 (quarenta e oito) horas após a assinatura deste contrato, a apólice do seguro
devidamente contratada e comprovação do pagamento do respectivo prêmio. A não
apresentação da apólice ou a interrupção do pagamento do seguro configura descumprimento
contratual, passível de aplicação das penalidades previstas neste contrato.

PARÁGRAFO TERCEIRO: Caso o seguro não seja contratado ou renovado anualmente pelos
LOCATÁRIOS, os LOCADORES poderão fazê-lo diretamente, imputando aos LOCATÁRIOS o
reembolso integral do valor pago.

CLÁUSULA NONA – DO DESVIRTUAMENTO DA LOCAÇÃO
Fica estipulado que, em caso de desvirtuamento da locação, bem como o mau uso provocando
deturpações do sossego público devidamente provocado, o presente contrato será
automaticamente rescindido, por culpa dos LOCATÁRIOS, que incorrerão na multa contratual
prescrita no presente contrato, na Cláusula Décima Terceira.

CLÁUSULA DÉCIMA – DAS RECLAMAÇÕES
As reclamações, sejam elas quais forem os motivos, deverão ser feitas obrigatoriamente
por escrito e encaminhadas ao escritório da procuradora dos LOCADORES, à qual compete a
administração do imóvel ora locado, ou a quem for indicado por escrito posteriormente.

CLÁUSULA DÉCIMA PRIMEIRA – DA FALTA DO PAGAMENTO DO ALUGUEL
A falta do pagamento do aluguel e demais encargos após a data do vencimento acarretará
no acréscimo de 10% (dez por cento) sob o valor do aluguel a título de multa, a partir
do 1º dia posterior ao vencimento, cobrança por intermédio de ADVOGADO, com a obrigação
dos LOCATÁRIOS a pagarem 10% (dez por cento) sobre o valor total do débito, a título de
honorários advocatícios, caso excedido o prazo de cobrança amigável de 30 (trinta) dias,
mantidas as obrigações previstas na Cláusula Segunda e §1º desta.

PARÁGRAFO PRIMEIRO: No caso de mora dos LOCATÁRIOS no pagamento de seu aluguel,
encargos convencionados e da importância devida, vencerá juros de 1% (um por cento)
ao mês, e, se o atraso for superior a 30 (trinta) dias, ficará também sujeito à
correção monetária de acordo com a lei.

PARÁGRAFO SEGUNDO: Os LOCATÁRIOS, desde já, autorizam, em caso de descumprimento de
qualquer cláusula contratual ora pactuada, que seus nomes sejam inclusos no
SCPC/SERASA para resguardo dos direitos assumidos.

CLÁUSULA DÉCIMA SEGUNDA – DA ENTREGA DO IMÓVEL PELOS LOCATÁRIOS
Ao restituir o imóvel objeto deste contrato, obrigam-se os LOCATÁRIOS a apresentarem as
03 (três) últimas contas de luz, água e gás devidamente quitadas; em caso contrário,
deverão deixar um depósito igual à última conta paga, multiplicado pelo número de meses
a pagar, considerando-se para tanto até o último dia de ocupação efetiva do imóvel.

PARÁGRAFO PRIMEIRO: Os LOCATÁRIOS, ao entregarem a chave do imóvel, e este não estando
nas condições que recebeu, autorizam os LOCADORES a procederem aos reparos e cobrar,
junto com o aluguel, taxa de condomínio e IPTU deste período, os quais serão pagos pelos
LOCATÁRIOS.

CLÁUSULA DÉCIMA TERCEIRA – DA MULTA E DAS INFRAÇÕES CONTRATUAIS
Fica estipulada uma multa equivalente a três meses de aluguel vigente por ocasião do
fato, à parte que infringir qualquer uma das Cláusulas previstas no presente contrato,
podendo a parte inocente considerar rescindida a locação independentemente de qualquer
formalidade. A multa será sempre proporcional, conforme previsto no Código Civil.

CLÁUSULA DÉCIMA QUARTA – DOS IMPOSTOS E DEMAIS AVENÇAS
Fica expressamente estabelecido que, além do aluguel, durante a vigência deste contrato,
fica por conta exclusiva dos LOCATÁRIOS o pagamento dos impostos prediais, taxa de
condomínio, multas provenientes pela má utilização do bem locado por qualquer órgão
público, e outros que recaiam ou venham a recair sobre o imóvel, objeto deste, bem como
as despesas decorrentes do consumo de água, luz, telefone, esgoto, gás, qualquer que
seja a forma de sua arrecadação, cabendo-lhes efetuar diretamente os pagamentos nos
locais indicados ou para a administração, quando necessário, sob pena de ficar onerado
com as multas e acréscimos que tais despesas venham a sofrer, ou ainda pela correção
monetária.

PARÁGRAFO ÚNICO: Os LOCATÁRIOS, sob pena de cometimento contratual de natureza grave,
são obrigados a entregar aos LOCADORES ou ao seu representante legal todas as
intimações, avisos, recibos, impostos, lançamentos e qualquer documento que diga
respeito ao imóvel locado, sob pena de serem responsabilizados pelas multas advindas de
seu ato.

CLÁUSULA DÉCIMA QUINTA – DA VENDA E VISTORIA DO IMÓVEL
Os LOCATÁRIOS desde já facultam aos LOCADORES ou a seu representante legal examinar e
vistoriar o imóvel quando assim julgar necessário. Caso o imóvel seja colocado à venda
ou hipotecado a terceiros, permitirão os LOCATÁRIOS, após certificado por escrito, que
os interessados na compra o visitem em dia e hora indicados, sempre, todavia, no
horário entre 10 (dez) e 16 (dezesseis) horas.

CLÁUSULA DÉCIMA SEXTA – DA RENOVAÇÃO DO CONTRATO
Os LOCATÁRIOS desde já ficam obrigados, no prazo de 60 (sessenta) dias antes do término
do presente contrato, a procurar o setor de renovação de contratos da ADMINISTRADORA,
para estudar a possibilidade de renovação ou não do prazo ora contratado; no caso de
não renovação, ficam os LOCATÁRIOS obrigados a entregar o imóvel nas mesmas condições
que receberam.

CLÁUSULA DÉCIMA SÉTIMA – DAS BENFEITORIAS
Os LOCATÁRIOS não terão direito a retenção ou indenização por qualquer benfeitoria ou
modificações, ainda que necessárias, introduzidas ou obras feitas no imóvel, a fim de
que, no momento em que os LOCATÁRIOS devolverem o imóvel aos LOCADORES, o façam tal
como receberam. No curso da locação, só poderão introduzir qualquer benfeitoria ou
alteração interna desde que não implique risco ou segurança do imóvel e tenha sido
autorizada por escrito pelos LOCADORES.

CLÁUSULA DÉCIMA OITAVA – DA ENTREGA DAS CHAVES PELA ADMINISTRADORA
A chave do imóvel será liberada aos LOCATÁRIOS após a devolução do contrato com firma
reconhecida e protocolos de transferência das contas de água, gás e energia elétrica
para seu nome, bem como a apresentação da apólice do seguro contra incêndio.

PARÁGRAFO PRIMEIRO: Instalação da energia elétrica nº ${valueOrPlaceholder(params.codes?.energyCode, '[CODIGO_INSTALACAO_ENERGIA]')},
código de usuário gás (concessionária) nº ${valueOrPlaceholder(params.codes?.gasCode, '[CODIGO_USUARIO_GAS]')},
cadastro água/esgoto nº ${valueOrPlaceholder(params.codes?.waterCode, '[CODIGO_CADASTRO_AGUA_ESGOTO]')}.

PARÁGRAFO SEGUNDO: Os LOCATÁRIOS declaram que, neste ato, estão recebendo da
ADMINISTRADORA as chaves do imóvel objeto deste contrato em perfeitas condições de
habitabilidade, aceitando e assinando em todos os seus termos o laudo de vistoria, que
fará parte integrante do presente ajuste, o qual especifica as condições em que se
encontra o imóvel.

CLÁUSULA DÉCIMA NONA – DO ABANDONO DO IMÓVEL
Fica estipulado que, em caso de abandono do imóvel pelos LOCATÁRIOS, caracterizado pela
ausência prolongada e injustificada, pela falta de pagamento do aluguel por período
superior a 30 (trinta) dias e pela constatação de desocupação voluntária, inclusive
mediante declarações de vizinhos e vistoria no local, será possível aos LOCADORES ou à
ADMINISTRADORA promoverem a retomada do imóvel mediante ação judicial de despejo por
abandono, nos termos do artigo 59, §1º, inciso IX, da Lei nº 8.245/91 (Lei do
Inquilinato).

Parágrafo Único: A ausência de bens móveis no interior do imóvel e a inexistência de
manifestação dos LOCATÁRIOS durante o período de inadimplemento poderão ser utilizados
como indícios de abandono, permitindo à parte LOCADORA o ajuizamento da respectiva
medida judicial de despejo, requerendo inclusive liminar para desocupação, conforme
previsão legal.

CLÁUSULA VIGÉSIMA – DO DIREITO DE PREFERÊNCIA NA COMPRA
Os LOCATÁRIOS terão direito de preferência na aquisição do imóvel ora locado, em
igualdade de condições com terceiros, conforme disposto no artigo 27 da Lei nº 8.245/91,
caso os LOCADORES decidam vendê-lo durante a vigência deste contrato.

PARÁGRAFO ÚNICO: A intenção de venda deverá ser formalmente comunicada aos LOCATÁRIOS,
com a indicação do preço, forma de pagamento e demais condições da proposta recebida de
terceiros, iniciando-se o prazo legal de 30 (trinta) dias para o exercício do direito de
preferência. A negociação será intermediada pela empresa ${admin.name},
administradora responsável pela presente locação.

CLÁUSULA VIGÉSIMA PRIMEIRA – DA VENDA DO IMÓVEL E DO PRAZO PARA DESOCUPAÇÃO
Caso os LOCADORES decidam vender o imóvel objeto deste contrato durante a vigência da
locação, os LOCATÁRIOS serão formalmente notificados para o exercício do direito de
preferência na compra, conforme previsto no artigo 27 da Lei nº 8.245/91, sendo-lhes
concedido o prazo legal de 30 (trinta) dias para manifestar interesse em adquirir o
imóvel, nas mesmas condições ofertadas a terceiros.

PARÁGRAFO PRIMEIRO: Caso os LOCATÁRIOS manifestem desinteresse pela aquisição do imóvel,
ou deixem de exercer seu direito de preferência dentro do prazo legal, e não haja
registro deste contrato de locação na matrícula do imóvel, poderá o adquirente solicitar
a desocupação do imóvel no prazo de até 90 (noventa) dias, contados da data do
recebimento de notificação formal nesse sentido, nos termos do §2º do artigo 8º da Lei
nº 8.245/91.

PARÁGRAFO SEGUNDO: Ocorrendo a venda com a manutenção do contrato, seja por vontade do
adquirente ou em razão do registro deste instrumento no Cartório de Registro de
Imóveis, o adquirente se sub-rogará nos direitos e obrigações dos LOCADORES, assumindo
integralmente as condições aqui pactuadas até o término do prazo contratual.

CLÁUSULA VIGÉSIMA SEGUNDA – DA DEVOLUÇÃO DO IMÓVEL E DAS CONTAS DE CONSUMO
No término ou na rescisão deste contrato de locação, os LOCATÁRIOS deverão,
obrigatoriamente, apresentar, no ato da entrega das chaves:

– O protocolo de transferência de titularidade das contas de gás, energia elétrica e
água para o nome do LOCADOR.

PARÁGRAFO ÚNICO: A não apresentação dos referidos protocolos poderá ensejar a retenção
das chaves e/ou a cobrança dos valores relativos ao consumo posterior, além das
penalidades previstas neste contrato.

CLÁUSULA VIGÉSIMA TERCEIRA – DO FUNDO DE OBRAS E MELHORIAS
Os LOCADORES declaram estar cientes de que são de sua exclusiva responsabilidade o
pagamento de despesas extraordinárias condominiais, inclusive aquelas relativas ao
fundo de obras e melhorias destinadas à conservação, valorização ou modernização do
edifício ou das áreas comuns, nos termos do artigo 22, §1º, da Lei nº 8.245/91 (Lei do
Inquilinato).

Parágrafo Único: Consideram-se despesas extraordinárias, para os efeitos desta cláusula,
aquelas que não se relacionam com os serviços rotineiros de manutenção do condomínio,
tais como reformas estruturais, pintura das fachadas, instalação de equipamentos de
segurança e obras para valorização do imóvel.

CLÁUSULA VIGÉSIMA QUARTA – DOS ANIMAIS DOMÉSTICOS
Caso ocorram danos ao imóvel locado decorrentes da presença de animais de estimação
pertencentes aos LOCATÁRIOS e/ou trazidos por visitantes ou terceiros, os LOCATÁRIOS
obrigam-se a proceder à reparação integral dos prejuízos, arcando com os custos das
restaurações necessárias, utilizando materiais de mesma qualidade e padrão aos
existentes.

Parágrafo Único: A constatação de tais danos será objeto de vistoria e, se necessário,
apresentação de orçamento por profissional habilitado, nos termos das cláusulas deste
contrato relativas à conservação e devolução do imóvel.

CLÁUSULA VIGÉSIMA QUINTA – DA ASSINATURA DIGITAL
As partes contratantes, LOCADORES e LOCATÁRIOS, declaram, para todos os fins de
direito, que concordam com a formalização e assinatura deste instrumento particular de
contrato de locação por meio exclusivamente digital, com uso de certificação digital ou
assinatura eletrônica qualificada, conforme definida na legislação vigente.

Para tanto, as partes utilizarão as plataformas Gov.br, com selo de confiabilidade
nível “prata” ou “ouro”, ou e-Notariado, mantida pelos Cartórios de Notas, sendo certo
que a autenticação e assinatura digital realizadas por qualquer dessas plataformas
conferem plena validade jurídica ao presente contrato, nos termos da Medida Provisória
nº 2.200-2/2001, da Lei nº 14.063/2020, do Código Civil Brasileiro e da regulamentação
do Colégio Notarial do Brasil – CNB.

As partes reconhecem a autenticidade, integridade, confiabilidade e eficácia probatória
das assinaturas digitais realizadas, obrigando-se por todos os efeitos legais e
contratuais a elas decorrentes.

CLÁUSULA VIGÉSIMA SEXTA – DO FORO
Para dirimir quaisquer controvérsias oriundas deste contrato, as partes elegem, de
comum acordo, o Foro da Comarca de ${params.property.city}/${params.property.state}, com renúncia expressa a
qualquer outro, por mais privilegiado que seja.

E, por estarem assim justos e contratados, firmam o presente instrumento em 3 (três)
vias de igual teor e forma, na presença de duas testemunhas.

${params.property.city.toUpperCase()}, ${formatDate(params.dates.contractSignLimitDate || new Date())}.

LOCADORES
_________________________________________
${params.landlords[0]?.fullName || '_________________________________________'}
_________________________________________
${params.landlords[1]?.fullName || '_________________________________________'}

LOCATÁRIOS
_________________________________________
${params.tenants[0]?.fullName || '_________________________________________'}
_________________________________________
${params.tenants[1]?.fullName || '_________________________________________'}

TESTEMUNHAS
_________________________________________
NOME:
CPF:
ENDEREÇO:

_________________________________________
NOME:
CPF:
ENDEREÇO:`;
}

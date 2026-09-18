export const categories = ["배송 문의", "교환·반품", "상품 문의", "기타 문의"];
export type SellerStore = { id:string; name:string; channel:string; address:string; exchangeFee:string; returnFee:string; shipping:string; returns:string; size:string };
export type Reply = { id:string; title:string; category:string; body:string; favorite:boolean };
export type DrawerState = { stores:SellerStore[]; replies:Reply[] };
export const storeFields = [{key:"name",label:"스토어명"},{key:"shipping",label:"출고 안내"},{key:"address",label:"반품 주소"},{key:"exchangeFee",label:"교환 배송비"},{key:"returnFee",label:"반품 배송비"},{key:"returns",label:"접수 방법"},{key:"size",label:"사이즈 안내"}] as const;
export const initialState: DrawerState = { stores:[{id:"store-1",name:"내 스토어",channel:"스마트스토어",address:"",exchangeFee:"",returnFee:"",shipping:"",returns:"",size:""}], replies:[
{id:"shipping-date",title:"언제 배송되나요?",category:"배송 문의",favorite:true,body:"안녕하세요, {스토어명}입니다.\n문의해 주셔서 감사합니다.\n\n{출고 안내}\n\n상품이 출고되면 주문 내역에서 운송장 번호와 배송 현황을 확인하실 수 있습니다.\n\n추가로 궁금한 점이 있으시면 문의 남겨 주세요. 감사합니다."},
{id:"tracking",title:"배송 현황을 확인하고 싶어요",category:"배송 문의",favorite:true,body:"안녕하세요, {스토어명}입니다.\n\n구매하신 쇼핑몰의 주문 내역에서 해당 상품의 ‘배송 조회’를 눌러 배송 현황을 확인해 주세요.\n\n조회가 어렵거나 도움이 필요하시면 주문번호와 함께 문의 남겨 주세요. 확인 후 안내해 드리겠습니다."},
{id:"exchange",title:"다른 옵션으로 교환하고 싶어요",category:"교환·반품",favorite:true,body:"안녕하세요, {스토어명}입니다.\n\n교환을 원하시는 옵션과 주문번호를 알려 주세요. 재고와 교환 가능 여부를 확인해 드리겠습니다.\n\n교환 접수 방법: {접수 방법}\n반품 주소: {반품 주소}\n고객 변심 시 교환 배송비: {교환 배송비}\n\n상품 불량·오배송 등 판매자 귀책 사유는 확인 후 별도로 안내해 드리겠습니다."},
{id:"return",title:"반품 절차를 알려 주세요",category:"교환·반품",favorite:false,body:"안녕하세요, {스토어명}입니다.\n\n반품 접수 방법: {접수 방법}\n반품 주소: {반품 주소}\n고객 변심 시 반품 배송비: {반품 배송비}\n\n반품 사유와 주문번호를 남겨 주시면 확인 후 자세히 안내해 드리겠습니다."},
{id:"size",title:"사이즈는 어떻게 고르나요?",category:"상품 문의",favorite:true,body:"안녕하세요, {스토어명}입니다.\n\n{사이즈 안내}\n\n원하시는 상품명과 옵션을 알려 주시면 더 자세히 안내해 드리겠습니다. 감사합니다."},
{id:"restock",title:"품절 상품, 재입고되나요?",category:"상품 문의",favorite:false,body:"안녕하세요, {스토어명}입니다.\n\n관심 가져 주셔서 감사합니다. 문의하신 상품명과 옵션을 알려 주시면 재입고 일정 확인 후 안내해 드리겠습니다."},
{id:"damaged",title:"상품에 문제가 있어요",category:"교환·반품",favorite:false,body:"안녕하세요, {스토어명}입니다.\n상품 이용에 불편을 드려 죄송합니다.\n\n주문번호와 문제가 확인되는 사진을 함께 남겨 주시면 확인 후 처리 방법을 안내해 드리겠습니다."},
{id:"thanks",title:"소중한 후기 감사합니다",category:"기타 문의",favorite:false,body:"안녕하세요, {스토어명}입니다.\n\n소중한 시간을 내어 후기 남겨 주셔서 감사합니다. 이용 중 궁금한 점이나 불편한 점이 있으시면 언제든 문의해 주세요.\n\n오늘도 좋은 하루 보내세요!"}] };
export function fillTemplate(body:string,store:SellerStore){const values:Record<string,string>={};for(const f of storeFields)values[f.label]=store[f.key];const missing:string[]=[];const text=body.replace(/\{([^{}]+)\}/g,(whole,key:string)=>{if(values[key]?.trim())return values[key];missing.push(key);return whole;});return{text,missing:[...new Set(missing)]};}

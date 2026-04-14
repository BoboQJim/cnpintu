// Province and scenic spot data
const PROVINCES_DATA = [
  { province: "北京", spots: ["故宫", "长城", "天坛"] },
  { province: "天津", spots: ["天津之眼", "五大道", "瓷房子"] },
  { province: "河北", spots: ["承德避暑山庄", "山海关", "赵州桥"] },
  { province: "山西", spots: ["平遥古城", "云冈石窟", "悬空寺"] },
  { province: "内蒙古", spots: ["呼伦贝尔草原", "响沙湾", "成吉思汗陵"] },
  { province: "辽宁", spots: ["沈阳故宫", "大连星海广场", "千山"] },
  { province: "吉林", spots: ["长白山天池", "雾凇岛", "伪满皇宫"] },
  { province: "黑龙江", spots: ["哈尔滨冰雪大世界", "太阳岛", "镜泊湖"] },
  { province: "上海", spots: ["外滩", "东方明珠", "豫园"] },
  { province: "江苏", spots: ["苏州园林", "中山陵", "周庄古镇"] },
  { province: "浙江", spots: ["西湖", "千岛湖", "乌镇"] },
  { province: "安徽", spots: ["黄山", "宏村", "九华山"] },
  { province: "福建", spots: ["鼓浪屿", "武夷山", "福建土楼"] },
  { province: "江西", spots: ["庐山", "滕王阁", "婺源"] },
  { province: "山东", spots: ["泰山", "趵突泉", "崂山"] },
  { province: "河南", spots: ["少林寺", "龙门石窟", "清明上河园"] },
  { province: "湖北", spots: ["黄鹤楼", "武当山", "三峡大坝"] },
  { province: "湖南", spots: ["张家界", "岳阳楼", "凤凰古城"] },
  { province: "广东", spots: ["广州塔", "开平碉楼", "丹霞山"] },
  { province: "广西", spots: ["桂林山水", "德天瀑布", "北海银滩"] },
  { province: "海南", spots: ["天涯海角", "南山寺", "亚龙湾"] },
  { province: "重庆", spots: ["洪崖洞", "大足石刻", "武隆天坑"] },
  { province: "四川", spots: ["九寨沟", "乐山大佛", "都江堰"] },
  { province: "贵州", spots: ["黄果树瀑布", "西江千户苗寨", "梵净山"] },
  { province: "云南", spots: ["丽江古城", "石林", "大理洱海"] },
  { province: "西藏", spots: ["布达拉宫", "纳木错", "大昭寺"] },
  { province: "陕西", spots: ["兵马俑", "华山", "大雁塔"] },
  { province: "甘肃", spots: ["莫高窟", "鸣沙山月牙泉", "嘉峪关"] },
  { province: "青海", spots: ["青海湖", "塔尔寺", "茶卡盐湖"] },
  { province: "宁夏", spots: ["沙坡头", "西夏王陵", "镇北铺影视城"] },
  { province: "新疆", spots: ["天山天池", "喀纳斯", "火焰山"] },
  { province: "香港", spots: ["维多利亚港", "太平山顶", "大屿山大佛"] },
  { province: "澳门", spots: ["大三巴牌坊", "澳门塔", "妈阁庙"] }
];

// Difficulty configurations
const DIFFICULTY = {
  easy:   { cols: 6,  rows: 4,  total: 24,  label: "简单", coins: 10, icon: "🌟" },
  medium: { cols: 8,  rows: 6,  total: 48,  label: "中等", coins: 30, icon: "⭐" },
  hard:   { cols: 15, rows: 10, total: 150, label: "困难", coins: 80, icon: "💫" }
};

// Props/Items configuration
const PROPS = {
  hint:      { name: "提示", desc: "高亮显示一个拼图块的正确位置", cost: 5,  icon: "💡" },
  autoPlace: { name: "自动放置", desc: "自动将一个拼图块放到正确位置", cost: 15, icon: "🎯" },
  preview:   { name: "预览", desc: "显示完整原图3秒钟", cost: 3,  icon: "👁️" }
};

// Get image path for a province + spot
function getImagePath(province, spot) {
  return `images/${encodeURIComponent(province)}-${encodeURIComponent(spot)}.jpg`;
}

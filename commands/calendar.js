let createCanvas = null; try { createCanvas = require("canvas").createCanvas; } catch (e) {}
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

const cacheDirectory = path.join(__dirname, 'cache');

module.exports = {
  config: {
    name: "calendar",
    author: "frnAlt",
    shortDescription: "🗓️ Stylish English Calendar — No API",
    longDescription: "Fully local calendar with proper weekdays for Asia/Dhaka.",
    category: "utility",
    guide: { en: "{p}calendar" }
  },

  onStart: async function ({ api, event }) {
    try {
      const now = moment().tz('Asia/Dhaka');
      const year = now.year();
      const month = now.month() + 1; // 1–12
      const monthName = now.format('MMMM');

      const daysInMonth = now.daysInMonth();
      const startWeekday = now.clone().startOf('month').day(); // 0=Sun…6=Sat

      const days = Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1;
        const m = moment.tz(`${year}-${month}-${d}`, 'YYYY-M-D', 'Asia/Dhaka');
        return {
          ad: String(d),
          weekday: m.format('ddd'),
          isToday: m.isSame(now, 'day')
        };
      });

      const width = 626, height = 480;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Background & Snow
      const grad = ctx.createLinearGradient(0,0,width,height);
      grad.addColorStop(0,'#0a0f3c'); grad.addColorStop(1,'#3a0057');
      ctx.fillStyle = grad; ctx.fillRect(0,0,width,height);
      for (let i=0;i<120;i++){
        const x=Math.random()*width, y=Math.random()*height, r=Math.random()*2+1;
        ctx.beginPath(); ctx.arc(x,y,r,0,2*Math.PI);
        ctx.fillStyle='rgba(255,255,255,0.25)';
        ctx.shadowColor='white'; ctx.shadowBlur=10;
        ctx.fill(); ctx.shadowBlur=0;
      }

      // Neon Frame
      const margin=15, fw=width-margin*2, fh=height-margin*2;
      ctx.beginPath(); roundedRect(ctx,margin,margin,fw,fh,20);
      ctx.strokeStyle='#aa00ff'; ctx.lineWidth=4;
      ctx.shadowColor='#ffb3ff'; ctx.shadowBlur=18;
      ctx.stroke(); ctx.shadowBlur=0;

      // Title & Time
      ctx.font='26px Arial'; ctx.fillStyle='white';
      ctx.shadowColor='#aa00ff'; ctx.shadowBlur=12;
      ctx.fillText(`📅 ${monthName} / ${year}`, 35,70);
      ctx.shadowBlur=0;

      ctx.font='15px Arial'; ctx.fillStyle='#ccc';
      const timeStr = now.format('dddd, MMMM D, YYYY h:mm A');
      ctx.fillText(`🕒 ${timeStr}`, 38,96);

      // Calendar Grid
      const cellW = 75, cellH = 55;
      const startX=48, startY=120;

      // Weekday headers
      const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const emoji = ['☀️','','','','','','🌙'];
      ctx.font='bold 14px Arial'; ctx.fillStyle='#fff';
      ctx.shadowColor='black'; ctx.shadowBlur=4;
      weekdays.forEach((wd,i)=>{
        ctx.fillText(emoji[i]?emoji[i]+' '+wd:wd, startX+i*cellW+10, startY+16);
      });
      ctx.shadowBlur=0;

      // Days
      let col = startWeekday, row = 1;
      days.forEach(day => {
        const x = startX + col*cellW, y = startY + row*cellH;
        if (day.isToday){
          ctx.fillStyle = '#ff1e56';
          ctx.shadowColor = '#ff1e56'; ctx.shadowBlur = 14;
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.shadowBlur = 0;
        }
        ctx.fillRect(x, y, cellW-5, cellH-5);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellW-5, cellH-5);

        ctx.fillStyle='white'; ctx.font='16px Arial';
        ctx.shadowColor='black'; ctx.shadowBlur=3;
        ctx.fillText(day.ad, x+20, y+30);
        ctx.shadowBlur=0;

        col++;
        if (col === 7) { col = 0; row++; }
      });

      // Save & Send
      const imgBuf = canvas.toBuffer();
      await fs.promises.mkdir(cacheDirectory, { recursive: true });
      await fs.promises.writeFile(path.join(cacheDirectory,'english_calendar.png'), imgBuf);
      api.sendMessage({ attachment: fs.createReadStream(path.join(cacheDirectory,'english_calendar.png')) }, event.threadID, event.messageID);

    } catch (e) {
      console.error(e);
    }
  }
};

// Rounded rectangle helper
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
    }
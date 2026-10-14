const fs = require('fs');

let content = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

const oldCall = "await safeUpsertDailySummary(usageDate, totalDeductionCost);";

const newCall = `
      const existing = dailySummaries[usageDate] || {
        usage_date: usageDate,
        total_expenditure: 0,
        student_count: null,
        guest_count: null,
        total_people: null,
        cost_per_head: null,
      };
      
      const newTotal = existing.total_expenditure + totalDeductionCost;
      const totalPeople = existing.total_people;
      const costPerHead = totalPeople && totalPeople > 0 ? newTotal / totalPeople : null;

      setDailySummaries((prev) => ({
        ...prev,
        [usageDate]: { ...existing, total_expenditure: newTotal, cost_per_head: costPerHead },
      }));

      await safeUpsertDailySummary({
        usage_date: usageDate,
        total_expenditure: newTotal,
        student_count: existing.student_count,
        guest_count: existing.guest_count,
        total_people: totalPeople,
        cost_per_head: costPerHead,
      });
`;

content = content.replace(oldCall, newCall);

fs.writeFileSync('src/context/AppContext.tsx', content);

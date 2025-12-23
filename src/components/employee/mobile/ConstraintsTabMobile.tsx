import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '../../ui/Card';

interface ConstraintsTabMobileProps {
  userName: string;
}

export const ConstraintsTabMobile: React.FC<ConstraintsTabMobileProps> = ({ userName }) => {
  // This will show employee-specific constraints and rules
  const constraints = [
    {
      id: 1,
      title: 'משמרות סוף שבוע',
      description: 'לא ניתן לבחור משמרות ערב ולילה ביום שישי, וכל המשמרות בשבת',
      type: 'rule' as const,
      icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />
    },
    {
      id: 2,
      title: 'מועד הגשה',
      description: 'יש להגיש זמינות עד יום שלישי בשעה 12:00, שבועיים לפני השבוע המבוקש',
      type: 'rule' as const,
      icon: <AlertTriangle className="w-5 h-5 text-blue-600" />
    },
    {
      id: 3,
      title: 'ימי חופשה',
      description: 'ימי חופשה ומחלה מסומנים אוטומטית כלא זמין בכל המשמרות',
      type: 'info' as const,
      icon: <CheckCircle className="w-5 h-5 text-green-600" />
    },
    {
      id: 4,
      title: 'חגים',
      description: 'בימי חג מסוימים, רק משמרות ספציפיות זמינות לבחירה',
      type: 'info' as const,
      icon: <CheckCircle className="w-5 h-5 text-purple-600" />
    }
  ];

  return (
    <div className="p-4 pb-24">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">אילוצים וכללים</h2>
        <p className="text-sm text-gray-600">
          כללי המערכת וההגבלות עבור הגשת זמינות
        </p>
      </div>

      <div className="space-y-3">
        {constraints.map((constraint) => (
          <Card key={constraint.id} padding="md" className="border-r-4 border-r-blue-500">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {constraint.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {constraint.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {constraint.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Personal constraints placeholder */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">אילוצים אישיים</h3>
        <Card padding="md" className="bg-gray-50">
          <div className="text-center py-6">
            <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 text-sm">אין אילוצים אישיים מוגדרים</p>
            <p className="text-gray-500 text-xs mt-1">
              צור קשר עם המנהל להוספת אילוצים אישיים
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

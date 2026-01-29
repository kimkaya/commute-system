// =====================================================
// 이용약관 페이지
// =====================================================

import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TermsOfServicePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <h1 className="ml-2 text-lg font-semibold text-gray-900">이용약관</h1>
        </div>
      </header>

      {/* 내용 */}
      <div className="p-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-6">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제1조 (목적)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              이 약관은 출퇴근 관리 시스템(이하 "서비스")의 이용 조건 및 절차, 
              회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제2조 (용어의 정의)</h2>
            <ul className="text-sm text-gray-600 space-y-2 ml-4 list-disc">
              <li>
                <strong>"서비스"</strong>란 회사가 제공하는 출퇴근 관리, 급여 관리, 
                휴가 관리 등 모든 관련 서비스를 의미합니다.
              </li>
              <li>
                <strong>"이용자"</strong>란 본 약관에 따라 회사가 제공하는 서비스를 
                받는 임직원을 의미합니다.
              </li>
              <li>
                <strong>"관리자"</strong>란 서비스의 운영 및 관리 권한을 가진 
                인사담당자를 의미합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제3조 (약관의 효력 및 변경)</h2>
            <ul className="text-sm text-gray-600 space-y-2 ml-4 list-decimal">
              <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
              <li>회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있습니다.</li>
              <li>변경된 약관은 시행일 7일 전부터 서비스 내 공지사항을 통해 고지합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제4조 (서비스의 제공)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              회사는 다음과 같은 서비스를 제공합니다:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
              <li>출퇴근 기록 및 조회</li>
              <li>급여 명세서 조회</li>
              <li>휴가 신청 및 관리</li>
              <li>근무 일정 조회</li>
              <li>개인정보 관리</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제5조 (이용자의 의무)</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-2">
              이용자는 다음 행위를 해서는 안 됩니다:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
              <li>타인의 계정을 도용하는 행위</li>
              <li>서비스의 정상적인 운영을 방해하는 행위</li>
              <li>허위 정보를 등록하거나 기록을 조작하는 행위</li>
              <li>회사의 지식재산권을 침해하는 행위</li>
              <li>법령 또는 회사 규정을 위반하는 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제6조 (서비스 이용 시간)</h2>
            <ul className="text-sm text-gray-600 space-y-2 ml-4 list-decimal">
              <li>서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.</li>
              <li>
                다만, 회사는 서비스 점검 등의 필요가 있는 경우 서비스의 전부 또는 
                일부를 일시 중단할 수 있으며, 이 경우 사전에 공지합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제7조 (서비스 이용의 제한)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              회사는 이용자가 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 
              방해한 경우, 서비스 이용을 제한할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제8조 (개인정보 보호)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              회사는 이용자의 개인정보를 보호하기 위해 노력하며, 
              개인정보의 보호 및 사용에 대해서는 관련 법령 및 회사의 
              개인정보 처리방침에 따릅니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제9조 (면책조항)</h2>
            <ul className="text-sm text-gray-600 space-y-2 ml-4 list-decimal">
              <li>
                회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중단 등 
                불가항력적 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.
              </li>
              <li>
                회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 
                책임을 지지 않습니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">제10조 (분쟁 해결)</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              서비스 이용과 관련하여 회사와 이용자 간에 발생한 분쟁은 
              양 당사자 간의 합의에 의해 원만히 해결함을 원칙으로 합니다. 
              합의가 이루어지지 않는 경우, 관할 법원에 소송을 제기할 수 있습니다.
            </p>
          </section>

          <p className="text-xs text-gray-400 text-center pt-4">
            시행일: 2024년 1월 1일
          </p>
        </div>
      </div>
    </div>
  );
}
